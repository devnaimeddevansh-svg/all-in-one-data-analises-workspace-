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

    const project = await db.researchProject.findFirst({
      where: { id, organizationId: organization.id },
      include: { reports: { orderBy: { createdAt: "desc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}
