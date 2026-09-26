import { evaluateGates } from "./gates.js";

function clamp01(x) {
  return Math.max(0, Math.min(1, Number(x) || 0));
}

/**
 * @param {object} metrics - {c,k,e,s,r,t,l} each 0..1 (l optional, defaults 0.5)
 * @param {string[]} tags - task tags for gate evaluation
 * @returns {{
 *   route: 'ai'|'human'|'hybrid'|'refused',
 *   scores: {AA:number, HN:number},
 *   gateFlags: string[],
 *   reason: string
 * }}
 */
export function scoreAndRouteTask(metrics, tags = []) {
  const c = clamp01(metrics.c);
  const k = clamp01(metrics.k);
  const e = clamp01(metrics.e);
  const s = clamp01(metrics.s);
  const r = clamp01(metrics.r);
  const t = clamp01(metrics.t);
  const l = metrics.l !== undefined ? clamp01(metrics.l) : 0.5;

  // 1. Gates first — non-overridable.
  const gateResult = evaluateGates({ c, k, e, s, r, t, l }, tags);

  if (gateResult.refused) {
    return {
      route: "refused",
      scores: { AA: 0, HN: 0 },
      gateFlags: gateResult.flags,
      reason: gateResult.reasons.join(" "),
    };
  }

  // Scores are still computed even when gated, for transparency in the
  // rationale — but the route itself is forced.
  const AA =
    0.3 * c +
    0.2 * (1 - k) +
    0.15 * (1 - e) +
    0.1 * (1 - s) +
    0.1 * (1 - r) +
    0.1 * t +
    0.05 * l;

  const HN = 0.3 * k + 0.25 * e + 0.2 * s + 0.15 * r + 0.1 * (1 - c);

  if (gateResult.gated) {
    return {
      route: gateResult.forcedRoute,
      scores: { AA: round2(AA), HN: round2(HN) },
      gateFlags: gateResult.flags,
      reason: gateResult.reasons.join(" "),
    };
  }

  // 2. Banded routing — ambiguous cases (within 0.08 of a boundary) fall to
  // HYBRID by default rather than a knife-edge AI/human call.
  let route = "hybrid";
  let reason = `Balanced factors (AA=${round2(AA)}, HN=${round2(HN)}) — routed to Hybrid: AI drafts, a named human reviews and approves.`;

  if (AA >= 0.7 && HN <= 0.35) {
    route = "ai";
    reason = `High AI Aptitude (${round2(AA)}) and low Human Need (${round2(HN)}) — routed to AI-only.`;
  } else if (HN >= 0.65 || AA <= 0.35) {
    route = "human";
    reason = `${HN >= 0.65 ? `High Human Need (${round2(HN)})` : `Low AI Aptitude (${round2(AA)})`} — routed to Human-only.`;
  }

  return {
    route,
    scores: { AA: round2(AA), HN: round2(HN) },
    gateFlags: [],
    reason,
  };
}

function round2(x) {
  return Math.round(x * 100) / 100;
}
