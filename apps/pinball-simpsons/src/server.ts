import "dotenv/config";
import { asc, desc } from "drizzle-orm";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getDb, initDb } from "./db.js";
import { highScores } from "./schema.js";

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
    const rows = await getDb()
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score), asc(highScores.createdAt))
      .limit(LEADERBOARD_LIMIT);

    res.json({
      scores: rows.map((r) => ({
        id: r.id,
        playerName: r.playerName,
        score: r.score,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
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

    const playerName = rawName.trim().slice(0, MAX_NAME_LEN);
    const score = Math.floor(rawScore);

    if (!playerName) {
      res.status(400).json({ error: "playerName must not be empty" });
      return;
    }
    if (!Number.isFinite(score) || score < 0) {
      res.status(400).json({ error: "score must be a non-negative integer" });
      return;
    }

    const [row] = await getDb()
      .insert(highScores)
      .values({ playerName, score })
      .returning({ id: highScores.id, createdAt: highScores.createdAt });

    res.status(201).json({
      id: row.id,
      playerName,
      score,
      createdAt: row.createdAt,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save score" });
  }
});

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

async function main() {
  await initDb();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pinball Simpsons listening on http://localhost:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
