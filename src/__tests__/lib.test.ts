import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, getPlanFromStripePriceId } from "@/lib/usage/plans";
import { slugify, formatBytes, getCurrentMonth } from "@/lib/utils";

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

  it("has increasing limits for paid tiers", () => {
    expect(PLAN_LIMITS.PRO.aiTasksPerMonth).toBeGreaterThan(PLAN_LIMITS.FREE.aiTasksPerMonth);
    expect(PLAN_LIMITS.BUSINESS.aiTasksPerMonth).toBeGreaterThan(PLAN_LIMITS.PRO.aiTasksPerMonth);
    expect(PLAN_LIMITS.SCALE.aiTasksPerMonth).toBeGreaterThan(PLAN_LIMITS.BUSINESS.aiTasksPerMonth);
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
    expect(slugify("My Company Inc.")).toBe("my-company-inc");
  });

  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  it("returns current month in YYYY-MM format", () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("AI tool definitions", () => {
  it("exports required tools", async () => {
    const { TOOL_DEFINITIONS } = await import("@/lib/ai/tools");
    const toolNames = TOOL_DEFINITIONS.map((t) => t.name);
    expect(toolNames).toContain("web_search");
    expect(toolNames).toContain("memory_search");
    expect(toolNames).toContain("memory_store");
    expect(toolNames).toContain("document_search");
    expect(toolNames).toContain("request_approval");
  });
});
