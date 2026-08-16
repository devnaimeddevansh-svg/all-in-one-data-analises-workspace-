import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { enqueueAgentRun, runAgentRunSync } from "@/lib/queue";
import { checkAiTaskLimit } from "@/lib/usage/tracker";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const agent = await db.agent.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const runs = await db.agentRun.findMany({
      where: { agentId: id, organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    return handleApiError(error);
  }
}

const runSchema = z.object({
  goal: z.string().min(1).max(5000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const { id } = await params;
    const body = await request.json();
    const { goal } = runSchema.parse(body);

    await checkAiTaskLimit(organization.id);

    const agent = await db.agent.findFirst({
      where: { id, organizationId: organization.id, isActive: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found or inactive" }, { status: 404 });
    }

    const run = await db.agentRun.create({
      data: {
        organizationId: organization.id,
        agentId: agent.id,
        userId: user.id,
        goal,
        status: "PENDING",
      },
    });

    const queued = await enqueueAgentRun(run.id);
    if (!queued) {
      await runAgentRunSync(run.id);
    }

    const updated = await db.agentRun.findUnique({ where: { id: run.id } });
    return NextResponse.json({ run: updated }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
