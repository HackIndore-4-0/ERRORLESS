// Character-level normalized Levenshtein distance, used to measure how much
// a human rewrote an AI draft before approving it (the "drift ratio").
// No external dependency on purpose — this is a small, self-contained
// algorithm and one less package to break during a demo.

/**
 * Raw Levenshtein edit distance between two strings (insertions, deletions,
 * substitutions). O(n*m) time, O(min(n,m)) space.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure `a` is the shorter string, to minimize row width.
  if (a.length > b.length) [a, b] = [b, a];

  let prevRow = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let i = 1; i <= b.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[a.length];
}

/**
 * Normalized drift ratio between an AI draft and the human's final text,
 * 0.0 (identical) to 1.0 (completely rewritten).
 *
 * @param {string} original - the AI-generated draft
 * @param {string} final - the human-submitted final text
 * @returns {number} drift ratio, 0..1
 */
export function computeDriftRatio(original, final) {
  const a = (original || "").trim();
  const b = (final || "").trim();

  if (a.length === 0 && b.length === 0) return 0;

  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);

  return maxLen === 0 ? 0 : Math.min(1, distance / maxLen);
}
