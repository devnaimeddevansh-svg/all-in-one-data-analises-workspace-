import { db } from "@/lib/db";
import { getCurrentMonth } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/usage/plans";
import type { PlanTier } from "@/generated/prisma/client";

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageLimitError";
  }
}

async function getOrCreateUsageRecord(organizationId: string) {
  const month = getCurrentMonth();
  const existing = await db.usageRecord.findFirst({
    where: { organizationId, month },
  });
  if (existing) return existing;
  return db.usageRecord.create({
    data: { organizationId, month },
  });
}

async function getOrgPlan(organizationId: string): Promise<PlanTier> {
  const sub = await db.subscription.findUnique({
    where: { organizationId },
  });
  return sub?.plan ?? "FREE";
}

export async function checkAiTaskLimit(organizationId: string): Promise<void> {
  const plan = await getOrgPlan(organizationId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getOrCreateUsageRecord(organizationId);
  if (usage.aiTasks >= limits.aiTasksPerMonth) {
    throw new UsageLimitError(
      `AI task limit reached (${limits.aiTasksPerMonth}/month on ${limits.name} plan). Upgrade to continue.`
    );
  }
}

export async function incrementAiTasks(organizationId: string, count = 1): Promise<void> {
  const month = getCurrentMonth();
  const existing = await db.usageRecord.findFirst({
    where: { organizationId, month },
  });
  if (existing) {
    await db.usageRecord.update({
      where: { id: existing.id },
      data: { aiTasks: { increment: count } },
    });
  } else {
    await db.usageRecord.create({
      data: { organizationId, month, aiTasks: count },
    });
  }
}

export async function checkResearchLimit(organizationId: string): Promise<void> {
  const plan = await getOrgPlan(organizationId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getOrCreateUsageRecord(organizationId);
  if (usage.researchProjects >= limits.researchProjectsPerMonth) {
    throw new UsageLimitError(
      `Research project limit reached (${limits.researchProjectsPerMonth}/month on ${limits.name} plan). Upgrade to continue.`
    );
  }
}

export async function incrementResearchProjects(organizationId: string): Promise<void> {
  const month = getCurrentMonth();
  const existing = await db.usageRecord.findFirst({
    where: { organizationId, month },
  });
  if (existing) {
    await db.usageRecord.update({
      where: { id: existing.id },
      data: { researchProjects: { increment: 1 } },
    });
  } else {
    await db.usageRecord.create({
      data: { organizationId, month, researchProjects: 1 },
    });
  }
}

export async function checkStorageLimit(
  organizationId: string,
  additionalBytes: number
): Promise<void> {
  const plan = await getOrgPlan(organizationId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getOrCreateUsageRecord(organizationId);
  if (Number(usage.storageBytes) + additionalBytes > limits.storageBytes) {
    throw new UsageLimitError(
      `Storage limit reached on ${limits.name} plan. Upgrade to continue.`
    );
  }
}

export async function incrementStorage(
  organizationId: string,
  bytes: number
): Promise<void> {
  const month = getCurrentMonth();
  const existing = await db.usageRecord.findFirst({
    where: { organizationId, month },
  });
  if (existing) {
    await db.usageRecord.update({
      where: { id: existing.id },
      data: { storageBytes: { increment: BigInt(bytes) } },
    });
  } else {
    await db.usageRecord.create({
      data: { organizationId, month, storageBytes: BigInt(bytes) },
    });
  }
}

export async function getUsageSummary(organizationId: string) {
  const plan = await getOrgPlan(organizationId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getOrCreateUsageRecord(organizationId);
  return {
    plan,
    limits,
    usage: {
      aiTasks: usage.aiTasks,
      researchProjects: usage.researchProjects,
      storageBytes: Number(usage.storageBytes),
    },
  };
}
