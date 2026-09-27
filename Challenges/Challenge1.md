Challenge 1: Automated Downstream Rework & Token Churn Telemetry Implement 
an automated telemetry endpoint in the FastAPI backend that calculates the edit 
distance (e.g., normalized Levenshtein distance or character diff ratio) between an initial 
AI-generated draft and the final text submitted by the human supervisor in a hybrid 
route. If the modification exceeds a 40% drift threshold, the system must classify the 
task as an implicit rework failure, automatically increment the task type's Human Need (
) baseline score in PostgreSQL, and append a misallocation penalty to the audit 
table. 
Expected Outcome: 
● A functioning backend API endpoint that ingests both the raw AI output and the 
finalized human artifact to compute an objective difference score. 
● Automated database logic in PostgreSQL that flags high-churn tasks as "hidden 
rework" and adjusts subsequent scoring parameters. 
● Dashboard visualization in Next.js showing true human time spent revising AI 
drafts alongside the re-weighted routing metrics. 