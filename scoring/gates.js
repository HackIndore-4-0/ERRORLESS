// Four hard gates, evaluated BEFORE scoring. Non-overridable — no learned
// weight, no cost pressure, no manager override can bypass these.
//
// G1 — Sensitivity: highly sensitive data forces at least HYBRID.
// G2 — Irreversibility: high-consequence/irreversible actions require a
//      named human to execute; AI may draft only.
// G3 — Regulated decision: hiring/firing/pay/credit/health/legal decisions
//      must be made by a human. AI never emits the decision output.
// G4 — Banned inputs: no emotion recognition, biometrics, or inferred
//      personal-trait scoring. Task is refused outright.

const REGULATED_TAGS = new Set([
  "hiring",
  "firing",
  "promotion",
  "pay",
  "credit",
  "health",
  "legal",
]);

const BANNED_TAGS = new Set([
  "emotion_recognition",
  "biometrics",
  "personality_scoring",
  "inferred_traits",
]);

/**
 * @param {object} metrics - {c,k,e,s,r,t,l}
 * @param {string[]} tags - task tags, e.g. ["hiring"], ["customer_complaint"]
 * @returns {{ gated: boolean, forcedRoute?: 'human'|'hybrid', flags: string[], reasons: string[], refused?: boolean }}
 */
export function evaluateGates(metrics, tags = []) {
  const flags = [];
  const reasons = [];
  let forcedRoute = null;

  // G4 — banned inputs: refuse the task entirely, before anything else.
  const bannedHit = tags.find((t) => BANNED_TAGS.has(t));
  if (bannedHit) {
    return {
      gated: true,
      refused: true,
      flags: ["G4"],
      reasons: [`Gate G4: task tag "${bannedHit}" is a banned input class (emotion/biometric/trait inference). Task refused.`],
    };
  }

  // G3 — regulated decision: human decides, no AI output for the decision itself.
  const regulatedHit = tags.find((t) => REGULATED_TAGS.has(t));
  if (regulatedHit) {
    flags.push("G3");
    reasons.push(`Gate G3: tag "${regulatedHit}" is a regulated decision — a human must decide, AI may not emit the decision output.`);
    forcedRoute = "human";
  }

  // G2 — irreversibility: r >= 0.75 means high-consequence/irreversible.
  if (metrics.r >= 0.75) {
    flags.push("G2");
    reasons.push("Gate G2: action is high-consequence/irreversible (r >= 0.75) — AI may draft only, a named human must execute.");
    if (forcedRoute !== "human") forcedRoute = "hybrid";
  }

  // G1 — sensitivity: s >= 0.70 forces at least HYBRID.
  if (metrics.s >= 0.70) {
    flags.push("G1");
    reasons.push("Gate G1: data sensitivity is high (s >= 0.70) — task requires at least human-in-the-loop review.");
    if (forcedRoute !== "human") forcedRoute = "hybrid";
  }

  if (flags.length > 0) {
    return { gated: true, forcedRoute, flags, reasons };
  }

  return { gated: false, flags: [], reasons: [] };
}
