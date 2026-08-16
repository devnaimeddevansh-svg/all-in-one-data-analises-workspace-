import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";

export async function DELETE() {
  try {
    const user = await requireAuth();

    await db.$transaction([
      db.membership.deleteMany({ where: { userId: user.id } }),
      db.user.delete({ where: { id: user.id } }),
    ]);

    await createAuditLog({ userId: user.id, action: "user.delete_account" });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await db.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (error) {
    return handleApiError(error);
  }
}
