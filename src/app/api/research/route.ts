import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { checkResearchLimit, incrementResearchProjects } from "@/lib/usage/tracker";
import { enqueueResearch } from "@/lib/queue";

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

    try {
      await enqueueResearch(project.id);
    } catch {
      const { runResearchOrchestrator } = await import("@/lib/ai/orchestrator");
      const result = await runResearchOrchestrator({
        organizationId: organization.id,
        userId: user.id,
        query,
      });

      await db.researchReport.create({
        data: {
          researchProjectId: project.id,
          title: result.title,
          content: result.content,
          sources: result.sources,
          recommendations: result.recommendations,
        },
      });

      await db.researchProject.update({
        where: { id: project.id },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
