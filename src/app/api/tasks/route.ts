import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const tasks = await db.task.findMany({
      where: {
        organizationId: organization.id,
        ...(status ? { status: status as "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED" } : {}),
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const body = await request.json();
    const data = createSchema.parse(body);

    const task = await db.task.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        title: data.title,
        description: data.description,
        status: data.status ?? "TODO",
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
