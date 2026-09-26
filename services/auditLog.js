import { supabase } from "../supabase.js";

/**
 * Writes one append-only audit row. Never throws — a logging failure
 * should not break the calling request.
 */
export async function logAudit({ actor, action, entity, before = null, after = null }) {
  const { error } = await supabase
    .from("audit_log")
    .insert([{ actor, action, entity, before, after }]);

  if (error) {
    console.error("[auditLog] failed to write audit row:", error.message);
  }
}
