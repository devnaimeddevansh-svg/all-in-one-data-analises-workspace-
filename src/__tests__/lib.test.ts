import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, getPlanFromStripePriceId } from "@/lib/usage/plans";
import { slugify, formatBytes, getCurrentMonth } from "@/lib/utils";
import { localEmbed } from "@/lib/ai/embeddings";

describe("PLAN_LIMITS", () => {
  it("defines all plan tiers", () => {
    expect(PLAN_LIMITS.FREE).toBeDefined();
    expect(PLAN_LIMITS.PRO).toBeDefined();
    expect(PLAN_LIMITS.BUSINESS).toBeDefined();
    expect(PLAN_LIMITS.SCALE).toBeDefined();
    expect(PLAN_LIMITS.ENTERPRISE).toBeDefined();
  });

  it("has correct free tier limits", () => {
    expect(PLAN_LIMITS.FREE.aiTasksPerMonth).toBe(10);
    expect(PLAN_LIMITS.FREE.researchProjectsPerMonth).toBe(3);
    expect(PLAN_LIMITS.FREE.agents).toBe(1);
  });
});

describe("getPlanFromStripePriceId", () => {
  it("returns FREE for unknown price IDs", () => {
    expect(getPlanFromStripePriceId("price_unknown")).toBe("FREE");
  });
});

describe("utils", () => {
  it("slugifies text", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });

  it("formats bytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("returns current month in YYYY-MM format", () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("AI", () => {
  it("exports required tools", async () => {
    const { TOOL_DEFINITIONS } = await import("@/lib/ai/tools");
    const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
    expect(toolNames).toContain("web_search");
    expect(toolNames).toContain("memory_store");
  });

  it("generates normalized local embeddings", () => {
    const a = localEmbed("hello world");
    const b = localEmbed("hello world");
    expect(a).toHaveLength(1536);
    expect(a).toEqual(b);
    const magnitude = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });
});
