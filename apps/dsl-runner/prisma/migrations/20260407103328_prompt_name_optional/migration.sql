-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "template" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Prompt" ("createdAt", "id", "name", "promptId", "template", "updatedAt", "version") SELECT "createdAt", "id", "name", "promptId", "template", "updatedAt", "version" FROM "Prompt";
DROP TABLE "Prompt";
ALTER TABLE "new_Prompt" RENAME TO "Prompt";
CREATE UNIQUE INDEX "Prompt_promptId_key" ON "Prompt"("promptId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
