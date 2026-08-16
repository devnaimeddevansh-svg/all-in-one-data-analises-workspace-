import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const run = await db.agentRun.findFirst({
      where: { id, organizationId: organization.id },
      include: { agent: { select: { id: true, name: true, type: true } } },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    return handleApiError(error);
  }
}
