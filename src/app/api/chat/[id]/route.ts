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

    const conversation = await db.conversation.findFirst({
      where: { id, organizationId: organization.id },
      include: {
        messages: {
          where: { role: { in: ["USER", "ASSISTANT"] } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase(),
        content: m.content,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
