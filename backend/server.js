import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import employeesRouter from "./routes/employees.js";
import tasksRouter from "./routes/tasks.js";
import dashboardRouter from "./routes/dashboard.js";
import { startSlaMonitor } from "./services/slaMonitor.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("/api/employees", employeesRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/dashboard", dashboardRouter);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HUMAI backend listening on port ${PORT}`);

  // Challenge 2: Dynamic SLA-Breach Cascade Rebalancing — background
  // worker that reroutes stale human/hybrid tasks. Disable with
  // SLA_MONITOR_ENABLED=false (e.g. in tests).
  if (process.env.SLA_MONITOR_ENABLED !== "false") {
    startSlaMonitor({ intervalMs: Number(process.env.SLA_POLL_INTERVAL_MS) || 30_000 });
  }
});
