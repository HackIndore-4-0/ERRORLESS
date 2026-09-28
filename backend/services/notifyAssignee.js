import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter = null;

// Railway Free/Trial/Hobby block outbound SMTP, so prefer an HTTPS email API.
// Set BREVO_API_KEY (+ EMAIL_FROM, a sender verified in Brevo) to use it.
async function sendMail({ to, subject, text }) {
  const { BREVO_API_KEY, EMAIL_FROM, GMAIL_USER } = process.env;
  if (BREVO_API_KEY) {
    const sender = EMAIL_FROM || GMAIL_USER;
    if (!sender) throw new Error("EMAIL_FROM (verified Brevo sender) is not set");
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: "HUMAI", email: sender }, to: [{ email: to }], subject, textContent: text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const t = getTransporter();
  if (!t) throw Object.assign(new Error("not_configured"), { code: "not_configured" });
  await t.sendMail({ from: `"HUMAI" <${GMAIL_USER}>`, to, subject, text });
}

function emailConfigured() {
  return !!(process.env.BREVO_API_KEY || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));
}

function getTransporter() {
  if (transporter) return transporter;

  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn(
      "[notifyAssignee] GMAIL_USER or GMAIL_APP_PASSWORD not set — " +
        "assignment emails will be skipped (logged only)."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    // Fail fast (instead of hanging) if the host blocks outbound SMTP.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return transporter;
}

/**
 * Emails an employee that a task has been assigned to them.
 * Never throws — a failed/skipped email should not break task creation.
 *
 * @param {{name:string, email:string}} employee
 * @param {{id:string, title:string, route:string, routing_reason:string}} task
 * @param {string} appUrl - base URL of the frontend, for the "open task" link
 */
export async function notifyAssignee(employee, task, appUrl = process.env.APP_URL || "") {
  if (!employee?.email) {
    console.warn(`[notifyAssignee] employee has no email — skipping notification for task ${task.id}`);
    return { sent: false, reason: "no_employee_email" };
  }

  if (!emailConfigured()) return { sent: false, reason: "not_configured" };

  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/tasks/${task.id}` : null;

  const subject = `HUMAI: New task assigned — ${task.title || "Untitled task"}`;
  const text = [
    `Hi ${employee.name || ""},`,
    ``,
    `A task has been assigned to you: "${task.title || "Untitled task"}"`,
    ``,
    `Route: ${task.route.toUpperCase()}`,
    `Why you: ${task.routing_reason || "(no reason recorded)"}`,
    link ? `\nOpen it here: ${link}` : "",
    ``,
    `— HUMAI`,
  ].join("\n");

  try {
    await sendMail({ to: employee.email, subject, text });
    return { sent: true, to: employee.email };
  } catch (err) {
    console.error(`[notifyAssignee] failed to send email for task ${task.id}:`, err.message);
    return { sent: false, reason: "send_failed", error: err.message };
  }
}

/**
 * Emails a manager (the assignee's manager_email, else MANAGER_EMAIL env var) when the SLA cascade can't find
 * anyone under the load ceiling to hand a stale task to — i.e. the whole
 * qualified team is saturated. Never throws, same as notifyAssignee.
 *
 * @param {{id:string, title:string, required_role:string, reassignment_count:number}} task
 */
export async function notifyManagerEscalation(task, reason, assignee = null) {
  // Prefer the stalled assignee's own manager; fall back to MANAGER_EMAIL.
  const managerEmail = assignee?.manager_email || process.env.MANAGER_EMAIL;
  if (!managerEmail) {
    console.warn(`[notifyManagerEscalation] no manager_email on assignee and MANAGER_EMAIL not set — skipping alert for task ${task.id}`);
    return { sent: false, reason: "no_manager_email" };
  }

  if (!emailConfigured()) return { sent: false, reason: "not_configured" };

  const subject = `HUMAI ALERT: SLA breach, no capacity — "${task.title || "Untitled task"}"`;
  const text = [
    `A task has breached its SLA and every qualified employee is at/above the ${Math.round(
      (task.load_ceiling ?? 0.85) * 100
    )}% load ceiling, so it could not be auto-reassigned.`,
    ``,
    `Task: ${task.title || "Untitled task"} (id: ${task.id})`,
    `Stalled assignee: ${assignee?.name || "(unknown)"}`,
    `Required role: ${task.required_role || "(any)"}`,
    `Reassignment attempts so far: ${task.reassignment_count ?? 0}`,
    `Reason: ${reason}`,
    ``,
    `This needs a manager's eyes — either free up capacity or intervene manually.`,
    ``,
    `— HUMAI`,
  ].join("\n");

  try {
    await sendMail({ to: managerEmail, subject, text });
    return { sent: true, to: managerEmail };
  } catch (err) {
    console.error(`[notifyManagerEscalation] failed to send alert for task ${task.id}:`, err.message);
    return { sent: false, reason: "send_failed", error: err.message };
  }
}
