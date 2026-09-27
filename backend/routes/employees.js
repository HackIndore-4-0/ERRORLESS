import express from "express";
import { supabase } from "../supabase.js";

const router = express.Router();

// GET /api/employees
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, employees: data });
});

// POST /api/employees
router.post("/", async (req, res) => {
  const { name, role, email, skills, current_load } = req.body;

  if (!name || !role || !email) {
    return res.status(400).json({ error: "name, role and email are required." });
  }

  const { data, error } = await supabase
    .from("employees")
    .insert([
      {
        name,
        role,
        email,
        skills: Array.isArray(skills) ? skills : [],
        current_load: typeof current_load === "number" ? current_load : 0.0,
      },
    ])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, employee: data });
});

// PATCH /api/employees/:id  (e.g. update current_load manually, or role/skills)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const allowed = ["name", "role", "email", "skills", "current_load"];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, employee: data });
});

export default router;
