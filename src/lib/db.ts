import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { isPrismaAccelerateUrl, resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const connectionString = resolveDatabaseUrl();

  const log =
    process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

  // prisma+ / prisma:// URLs are handled by Prisma's own engine (no pg adapter)
  if (isPrismaAccelerateUrl(rawUrl)) {
    return new PrismaClient({ log: [...log] } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: [...log] });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
