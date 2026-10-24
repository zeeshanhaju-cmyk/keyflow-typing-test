import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "results.json");

app.use(cors());
app.use(express.json({ limit: "30kb" }));
fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]", "utf8");

function readResults() {
  try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); }
  catch { return []; }
}
function writeResults(rows) {
  fs.writeFileSync(dataFile, JSON.stringify(rows.slice(0, 500), null, 2), "utf8");
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "KeyFlow API" }));

app.get("/api/results", (_req, res) => {
  const results = readResults().slice(0, 25);
  res.json({ results });
});

app.post("/api/results", (req, res) => {
  const { name = "Guest", wpm, accuracy, errors, duration, difficulty } = req.body ?? {};
  const valid = Number.isFinite(wpm) && wpm >= 0 && wpm <= 300
    && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100
    && Number.isFinite(errors) && errors >= 0 && errors <= 100000
    && Number.isFinite(duration) && duration > 0 && duration <= 3600
    && ["easy", "medium", "hard"].includes(difficulty);
  if (!valid) return res.status(400).json({ error: "Invalid typing result." });

  const cleanName = String(name).trim().replace(/[<>]/g, "").slice(0, 40) || "Guest";
  const row = {
    id: `KF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    name: cleanName,
    wpm: Math.round(wpm * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    errors: Math.round(errors),
    duration: Math.round(duration),
    difficulty,
    createdAt: new Date().toISOString()
  };
  const rows = [row, ...readResults()].slice(0, 500);
  writeResults(rows);
  res.status(201).json({ result: row });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`KeyFlow API running on port ${PORT}`);
});

