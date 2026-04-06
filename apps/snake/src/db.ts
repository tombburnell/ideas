import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function defaultDbUrl(): string {
  return "file:data/snake.db";
}

function ensureFileParentDir(url: string): void {
  if (!url.startsWith("file:")) return;
  const rest = url.slice("file:".length);
  const abs = path.isAbsolute(rest) ? rest : path.join(process.cwd(), rest);
  const dir = path.dirname(abs);
  fs.mkdirSync(dir, { recursive: true });
}

let client: ReturnType<typeof createClient> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL?.trim() || defaultDbUrl();
  ensureFileParentDir(url);
  if (!client) {
    client = createClient({ url });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance!;
}

export async function initDb(): Promise<void> {
  getDb();
  const migrationsFolder = path.join(__dirname, "..", "drizzle");
  await migrate(getDb(), { migrationsFolder });
}
