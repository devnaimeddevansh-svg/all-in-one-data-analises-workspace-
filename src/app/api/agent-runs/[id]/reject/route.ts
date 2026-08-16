import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { rejectAgentRun } from "@/lib/ai/agent-orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const run = await db.agentRun.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    await rejectAgentRun(id);

    const updated = await db.agentRun.findUnique({ where: { id } });
    return NextResponse.json({ run: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
