import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const highScores = sqliteTable(
  "high_scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerName: text("player_name", { length: 32 }).notNull(),
    score: integer("score").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    scoreCreatedIdx: index("idx_high_scores_score_created").on(t.score, t.createdAt),
  })
);
