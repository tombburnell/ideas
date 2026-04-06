import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { appConfig } from "@/config/app-config";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const sqliteAdapter = new PrismaBetterSqlite3(
  {
    url: appConfig.database.url
  },
  {
    timestampFormat: "unixepoch-ms"
  }
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: sqliteAdapter
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
