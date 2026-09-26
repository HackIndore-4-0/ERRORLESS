import express from "express";
import { supabase } from "../supabase.js";
import { scoreAndRouteTask } from "../scoring/scoreTask.js";
import { findBestEmployee } from "../scoring/assignEmployee.js";
import { extractTaskFeatures, generateAiOutput } from "../services/extractFeatures.js";
import { notifyAssignee } from "../services/notifyAssignee.js";
import { logAudit } from "../services/auditLog.js";

const router = express.Router();

const LOAD_INCREMENT = 0.1; // rough per-task load bump when a human/hybrid task is assigned

// -----------------------------------------------------------------------
// POST /api/tasks/intake
// -----------------------------------------------------------------------
router.post("/intake", async (req, res) => {
  try {
    const { title, description, required_role } = req.body;

    if (!description) {
      return res.status(400).json({ error: "description is required." });
    }

    // 1. Extract features + tags via Groq
    const { tags, ...metrics } = await extractTaskFeatures(title, description);

    // 2. Score + gate + route
    const decision = scoreAndRouteTask(metrics, tags);

    // 2a. G4 refusal — do not create a task record, just log and return.
    if (decision.route === "refused") {
      await logAudit({
        actor: "system",
        action: "task_refused",
        entity: `task:intake:${title || "untitled"}`,
        after: { reason: decision.reason, tags },
      });
      return res.status(422).json({
        success: false,
        refused: true,
        reason: decision.reason,
      });
    }

    // 3. Assign an employee if the route needs a human at all
    let assignedEmployee = null;
    let assignmentFallback = false;

    if (decision.route === "human" || decision.route === "hybrid") {
      const { data: employees, error: empErr } = await supabase.from("employees").select("*");
      if (empErr) throw empErr;

      const result = findBestEmployee(employees || [], required_role);
      assignedEmployee = result.employee;
      assignmentFallback = result.fallback;
    }

    // 4. Generate AI output — full execution for 'ai', a draft for 'hybrid'
    let aiOutput = null;
    if (decision.route === "ai") {
      aiOutput = await generateAiOutput(title, description, "execute");
    } else if (decision.route === "hybrid") {
      aiOutput = await generateAiOutput(title, description, "draft");
    }

    // 5. Determine status
    const status =
      decision.route === "ai"
        ? "completed"
        : "pending_approval"; // human or hybrid both wait on the approval endpoint

    // 6. Persist task
    const { data: newTask, error: dbError } = await supabase
      .from("tasks")
      .insert([
        {
          title,
          description,
          required_role: required_role || null,
          metrics: { ...metrics, tags },
          route: decision.route,
          aa_score: decision.scores.AA,
          hn_score: decision.scores.HN,
          gate_flags: decision.gateFlags,
          routing_reason: decision.reason,
          assigned_employee_id: assignedEmployee?.id || null,
          status,
          ai_output: aiOutput,
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    await logAudit({
      actor: "system",
      action: "task_routed",
      entity: `task:${newTask.id}`,
      after: {
        route: decision.route,
        gateFlags: decision.gateFlags,
        assignedEmployeeId: assignedEmployee?.id || null,
        assignmentFallback,
      },
    });

    // 7. Notify assignee + bump their load (human/hybrid only)
    let notification = { sent: false, reason: "not_applicable" };
    if (assignedEmployee) {
      notification = await notifyAssignee(assignedEmployee, newTask);

      const bumpedLoad = Math.min(1, (assignedEmployee.current_load ?? 0) + LOAD_INCREMENT);
      await supabase.from("employees").update({ current_load: bumpedLoad }).eq("id", assignedEmployee.id);
    }

    res.status(201).json({
      success: true,
      task: newTask,
      decision,
      assigned_to: assignedEmployee,
      assignment_fallback: assignmentFallback,
      notification,
    });
  } catch (err) {
    console.error("[tasks/intake] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------
// GET /api/tasks
// -----------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { status, route } = req.query;

  let query = supabase
    .from("tasks")
    .select("*, employees:assigned_employee_id (id, name, role, email)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (route) query = query.eq("route", route);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, tasks: data });
});

// -----------------------------------------------------------------------
// GET /api/tasks/:id
// -----------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, employees:assigned_employee_id (id, name, role, email)")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Task not found." });
  res.json({ success: true, task: data });
});

// -----------------------------------------------------------------------
// PATCH /api/tasks/:id/approve
// The missing piece from the original handoff — closes the hybrid/human
// review loop. Body: { approver_id, decision: 'approved'|'rejected'|'edited',
// note?, final_output? }
// -----------------------------------------------------------------------
router.patch("/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, decision, note, final_output } = req.body;

    if (!decision || !["approved", "rejected", "edited"].includes(decision)) {
      return res.status(400).json({ error: "decision must be one of approved | rejected | edited." });
    }

    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single();

    if (taskErr || !task) return res.status(404).json({ error: "Task not found." });

    if (task.status !== "pending_approval") {
      return res.status(409).json({ error: `Task is not awaiting approval (status: ${task.status}).` });
    }

    // 1. Record the approval decision
    const { data: approval, error: apprErr } = await supabase
      .from("approvals")
      .insert([
        {
          task_id: id,
          approver_id: approver_id || null,
          decision,
          note: note || null,
          final_output: decision === "edited" ? final_output || null : null,
        },
      ])
      .select()
      .single();

    if (apprErr) throw apprErr;

    // 2. Update task status
    const newStatus = decision === "rejected" ? "rejected" : "completed";
    const outputToStore =
      decision === "edited" && final_output ? final_output : task.ai_output;

    const { data: updatedTask, error: updateErr } = await supabase
      .from("tasks")
      .update({ status: newStatus, ai_output: outputToStore, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await logAudit({
      actor: approver_id || "manager",
      action: "task_approved",
      entity: `task:${id}`,
      before: { status: task.status },
      after: { status: newStatus, decision, note },
    });

    res.json({ success: true, task: updatedTask, approval });
  } catch (err) {
    console.error("[tasks/:id/approve] error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
