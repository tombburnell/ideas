import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, initDb } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MAX_NAME_LEN = 32;
const LEADERBOARD_LIMIT = 20;

const app = express();
app.use(express.json({ limit: "4kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/scores", async (_req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{
      id: number;
      player_name: string;
      score: number;
      created_at: string;
    }>(
      `SELECT id, player_name, score, created_at
       FROM high_scores
       ORDER BY score DESC, created_at ASC
       LIMIT $1`,
      [LEADERBOARD_LIMIT]
    );
    res.json({
      scores: rows.map((r) => ({
        id: r.id,
        playerName: r.player_name,
        score: r.score,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load scores" });
  }
});

app.post("/api/scores", async (req, res) => {
  try {
    const rawName = req.body?.playerName;
    const rawScore = req.body?.score;
    if (typeof rawName !== "string" || typeof rawScore !== "number") {
      res.status(400).json({ error: "playerName (string) and score (number) required" });
      return;
    }
    const name = rawName.trim().slice(0, MAX_NAME_LEN);
    const score = Math.floor(rawScore);
    if (!name || name.length === 0) {
      res.status(400).json({ error: "playerName must not be empty" });
      return;
    }
    if (!Number.isFinite(score) || score < 0) {
      res.status(400).json({ error: "score must be a non-negative integer" });
      return;
    }

    const pool = getPool();
    const { rows } = await pool.query<{ id: number; created_at: string }>(
      `INSERT INTO high_scores (player_name, score)
       VALUES ($1, $2)
       RETURNING id, created_at`,
      [name, score]
    );
    const row = rows[0];
    res.status(201).json({
      id: row.id,
      playerName: name,
      score,
      createdAt: row.created_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save score" });
  }
});

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function main() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Snake server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
