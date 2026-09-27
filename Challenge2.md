Challenge 2: Dynamic SLA-Breach Cascade Rebalancing Develop an asynchronous 
queue worker in the backend that continuously tracks aging tasks assigned to human or 
hybrid workflows in PostgreSQL against strict SLA countdown windows. If an assigned 
employee does not claim or progress a task before 75% of its time limit expires, the 
engine must recalculate available team capacities and dynamically cascade the 
assignment to the next qualified employee whose current workload is below the 0.85 
threshold, triggering an emergency manager alert if the entire department is saturated. 
Expected Outcome: 
● An asynchronous background worker monitoring task queue latencies and 
time-to-first-action. 
● A deterministic reassignment algorithm that reroutes stale tasks without violating 
the 0.85 individual capacity ceiling or bypassing hard safety gates. 
● A verifiable test run showing an aging task automatically migrating to an alternate 
low-load assignee and logging the handover event in the audit trail 
