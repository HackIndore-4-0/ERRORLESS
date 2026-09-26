import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import employeesRouter from "./routes/employees.js";
import tasksRouter from "./routes/tasks.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use("/api/employees", employeesRouter);
app.use("/api/tasks", tasksRouter);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HUMAI backend listening on port ${PORT}`);
});
