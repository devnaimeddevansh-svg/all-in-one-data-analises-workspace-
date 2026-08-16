import { db } from "@/lib/db";
import { AGENT_PRESETS } from "@/lib/agents/defaults";

export async function ensureDefaultAgents(organizationId: string): Promise<void> {
  const existing = await db.agent.count({ where: { organizationId } });
  if (existing > 0) return;

  await db.agent.createMany({
    data: AGENT_PRESETS.map((preset) => ({
      organizationId,
      name: preset.name,
      type: preset.type,
      description: preset.description,
      systemPrompt: preset.systemPrompt,
      tools: preset.tools,
      isActive: true,
    })),
  });
}
