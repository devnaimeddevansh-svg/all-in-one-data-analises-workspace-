import { NextResponse } from "next/server";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { deleteMemory } from "@/lib/memory";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { id } = await params;

    const result = await deleteMemory(id, organization.id);
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
