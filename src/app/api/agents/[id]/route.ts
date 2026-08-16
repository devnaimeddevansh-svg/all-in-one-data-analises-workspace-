import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const agent = await db.agent.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        runs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).max(10000).optional(),
  tools: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await db.agent.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = await db.agent.update({
      where: { id },
      data,
    });

    return NextResponse.json({ agent });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const existing = await db.agent.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db.agent.delete({ where: { id } });
    return NextResponse.json({ message: "Agent deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
