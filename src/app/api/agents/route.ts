import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { ensureDefaultAgents } from "@/lib/agents/seed";
import { getAgentPreset } from "@/lib/agents/defaults";
import type { AgentType } from "@/generated/prisma/client";

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();
    await ensureDefaultAgents(organization.id);

    const agents = await db.agent.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "asc" },
      include: {
        runs: { orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { runs: true } },
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([
    "RESEARCHER",
    "BUSINESS_ANALYST",
    "MARKETING_MANAGER",
    "SALES_ASSISTANT",
    "OPERATIONS_MANAGER",
    "EXECUTIVE_ASSISTANT",
    "CUSTOM",
  ]),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().min(10).max(10000).optional(),
  tools: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const { organization } = await requireAuthWithOrg();
    const body = await request.json();
    const data = createSchema.parse(body);

    const preset = getAgentPreset(data.type as AgentType);
    const agent = await db.agent.create({
      data: {
        organizationId: organization.id,
        name: data.name,
        type: data.type,
        description: data.description ?? preset?.description,
        systemPrompt: data.systemPrompt ?? preset?.systemPrompt ?? "You are a helpful AI agent.",
        tools: data.tools ?? preset?.tools ?? ["web_search"],
        isActive: true,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
