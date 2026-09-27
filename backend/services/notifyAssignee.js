import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter = null;

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
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
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

  const t = getTransporter();
  if (!t) return { sent: false, reason: "not_configured" };

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
    await t.sendMail({
      from: `"HUMAI" <${process.env.GMAIL_USER}>`,
      to: employee.email,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[notifyAssignee] failed to send email for task ${task.id}:`, err.message);
    return { sent: false, reason: "send_failed", error: err.message };
  }
}
