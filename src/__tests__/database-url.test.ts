import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveDatabaseUrl, isPrismaAccelerateUrl } from "@/lib/database-url";

describe("resolveDatabaseUrl", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it("returns standard postgres URLs unchanged", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    expect(resolveDatabaseUrl()).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("detects prisma accelerate URLs", () => {
    expect(isPrismaAccelerateUrl("prisma+postgres://localhost")).toBe(true);
    expect(isPrismaAccelerateUrl("postgresql://localhost")).toBe(false);
  });
});
