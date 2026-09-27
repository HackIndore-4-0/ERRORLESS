const LOAD_CEILING = 0.85; // employees at/above this are considered overloaded

/**
 * Picks the best employee for a task that needs a human (route = 'human' or 'hybrid').
 *
 * Matching rule: filter to employees whose role matches requiredRole (case-insensitive)
 * and whose current_load is below the ceiling; break ties by lowest load.
 * Falls back to the lowest-load employee overall if no role match is under the ceiling,
 * so a task is never left unassigned — but the fallback is flagged in the return value
 * so the caller can surface it (e.g. in the rationale / audit log).
 *
 * @param {Array<{id:string,role:string,current_load:number}>} employees
 * @param {string} requiredRole
 * @returns {{ employee: object|null, fallback: boolean }}
 */
export function findBestEmployee(employees, requiredRole) {
  if (!employees || employees.length === 0) {
    return { employee: null, fallback: false };
  }

  const roleMatches = requiredRole
    ? employees.filter(
        (emp) => (emp.role || "").toLowerCase() === requiredRole.toLowerCase()
      )
    : employees;

  const eligible = roleMatches
    .filter((emp) => (emp.current_load ?? 0) < LOAD_CEILING)
    .sort((a, b) => (a.current_load ?? 0) - (b.current_load ?? 0));

  if (eligible.length > 0) {
    return { employee: eligible[0], fallback: false };
  }

  // No eligible role match under the load ceiling — fall back to whoever
  // (any role) has the lowest load, rather than silently dropping the task.
  const fallbackSorted = [...employees].sort(
    (a, b) => (a.current_load ?? 0) - (b.current_load ?? 0)
  );

  return { employee: fallbackSorted[0] || null, fallback: true };
}
