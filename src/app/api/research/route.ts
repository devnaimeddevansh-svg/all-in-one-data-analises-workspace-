import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { checkResearchLimit, incrementResearchProjects } from "@/lib/usage/tracker";
import { enqueueResearch, runResearchSync } from "@/lib/queue";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  query: z.string().min(1).max(5000),
});

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();

    const projects = await db.researchProject.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      include: {
        reports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const body = await request.json();
    const { title, query } = createSchema.parse(body);

    await checkResearchLimit(organization.id);

    const project = await db.researchProject.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        title,
        query,
        status: "IN_PROGRESS",
      },
    });

    await incrementResearchProjects(organization.id);

    const queued = await enqueueResearch(project.id);
    if (!queued) {
      await runResearchSync(project.id);
    }

    const updated = await db.researchProject.findUnique({
      where: { id: project.id },
      include: { reports: true },
    });

    return NextResponse.json({ project: updated }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
