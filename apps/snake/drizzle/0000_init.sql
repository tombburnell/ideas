CREATE TABLE `high_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_name` text(32) NOT NULL,
	`score` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_high_scores_score_created` ON `high_scores` (`score`,`created_at`);