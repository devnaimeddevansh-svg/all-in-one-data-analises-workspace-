import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { executeTool } from "@/lib/ai/tools";
import { incrementAiTasks } from "@/lib/usage/tracker";
import { Prisma, type AgentType } from "@/generated/prisma/client";

interface AgentStep {
  name: string;
  status: "completed" | "failed";
  summary: string;
}

interface ConsequentialAction {
  action: string;
  details: Record<string, unknown>;
}

interface AgentAnalysis {
  summary: string;
  consequentialAction: ConsequentialAction | null;
}

const CONSEQUENTIAL_TYPES: AgentType[] = [
  "SALES_ASSISTANT",
  "MARKETING_MANAGER",
  "EXECUTIVE_ASSISTANT",
];

async function gatherContext(
  organizationId: string,
  userId: string | undefined,
  tools: string[],
  goal: string
): Promise<{ context: string; steps: AgentStep[] }> {
  const steps: AgentStep[] = [];
  const parts: string[] = [];

  const toolContext = { organizationId, userId };

  if (tools.includes("web_search")) {
    try {
      const result = await executeTool("web_search", { query: goal }, toolContext);
      parts.push(`## Web Search Results\n${result}`);
      steps.push({ name: "web_search", status: "completed", summary: "Searched the web" });
    } catch (e) {
      steps.push({ name: "web_search", status: "failed", summary: String(e) });
    }
  }

  if (tools.includes("document_search")) {
    try {
      const result = await executeTool("document_search", { query: goal }, toolContext);
      parts.push(`## Document Search Results\n${result}`);
      steps.push({ name: "document_search", status: "completed", summary: "Searched documents" });
    } catch (e) {
      steps.push({ name: "document_search", status: "failed", summary: String(e) });
    }
  }

  if (tools.includes("memory_search")) {
    try {
      const result = await executeTool("memory_search", { query: goal }, toolContext);
      parts.push(`## Memory Search Results\n${result}`);
      steps.push({ name: "memory_search", status: "completed", summary: "Searched memories" });
    } catch (e) {
      steps.push({ name: "memory_search", status: "failed", summary: String(e) });
    }
  }

  return { context: parts.join("\n\n"), steps };
}

function parseAnalysisResponse(content: string): AgentAnalysis {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as AgentAnalysis;
      return {
        summary: parsed.summary || content.replace(jsonMatch[0], "").trim(),
        consequentialAction: parsed.consequentialAction ?? null,
      };
    } catch {
      // fall through
    }
  }

  const actionMatch = content.match(/ACTION_REQUIRED:\s*(.+)/i);
  if (actionMatch) {
    return {
      summary: content.replace(/ACTION_REQUIRED:.*/i, "").trim(),
      consequentialAction: { action: actionMatch[1].trim(), details: {} },
    };
  }

  return { summary: content, consequentialAction: null };
}

export async function runAgentOrchestrator(runId: string): Promise<void> {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: { agent: true },
  });
  if (!run) throw new Error("Agent run not found");

  await db.agentRun.update({
    where: { id: runId },
    data: { status: "RUNNING" },
  });

  try {
    const tools = (run.agent.tools as string[]) ?? [];
    const { context, steps } = await gatherContext(
      run.organizationId,
      run.userId ?? undefined,
      tools,
      run.goal
    );

    const provider = getAIProvider();
    const response = await provider.chat({
      messages: [
        { role: "system", content: run.agent.systemPrompt },
        {
          role: "user",
          content: `Goal: ${run.goal}

${context ? `Gathered context:\n${context}\n\n` : ""}Produce a thorough analysis and action plan for this goal.

At the very end of your response, include a JSON block (fenced with \`\`\`json) with this structure:
{
  "summary": "Brief one-line summary of outcome",
  "consequentialAction": null OR { "action": "description of action needing approval", "details": { "key": "value" } }
}

Set consequentialAction if the goal requires sending emails, publishing content, making purchases, or contacting external parties. Otherwise set it to null.`,
        },
      ],
      temperature: 0.4,
      maxTokens: 6000,
    });

    await incrementAiTasks(run.organizationId);

    const analysis = parseAnalysisResponse(response.content);
    steps.push({ name: "analysis", status: "completed", summary: "Generated analysis" });

    const needsApproval =
      analysis.consequentialAction !== null ||
      (CONSEQUENTIAL_TYPES.includes(run.agent.type) &&
        analysis.summary.toLowerCase().includes("outreach"));

    if (needsApproval && analysis.consequentialAction) {
      await db.agentRun.update({
        where: { id: runId },
        data: {
          status: "AWAITING_APPROVAL",
          result: analysis.summary,
          pendingAction: analysis.consequentialAction as unknown as Prisma.InputJsonValue,
          metadata: { steps } as unknown as Prisma.InputJsonValue,
        },
      });
      return;
    }

    if (tools.includes("create_task")) {
      try {
        await executeTool(
          "create_task",
          {
            title: `Follow-up: ${run.goal.slice(0, 80)}`,
            description: analysis.summary.slice(0, 500),
            priority: "MEDIUM",
          },
          { organizationId: run.organizationId, userId: run.userId ?? undefined }
        );
        steps.push({ name: "create_task", status: "completed", summary: "Created follow-up task" });
      } catch {
        steps.push({ name: "create_task", status: "failed", summary: "Could not create task" });
      }
    }

    if (tools.includes("memory_store")) {
      try {
        await executeTool(
          "memory_store",
          { content: `Agent run (${run.agent.name}): ${analysis.summary.slice(0, 300)}`, type: "BUSINESS" },
          { organizationId: run.organizationId, userId: run.userId ?? undefined }
        );
        steps.push({ name: "memory_store", status: "completed", summary: "Stored key insight" });
      } catch {
        steps.push({ name: "memory_store", status: "failed", summary: "Could not store memory" });
      }
    }

    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED",
        result: analysis.summary,
        pendingAction: Prisma.JsonNull,
        metadata: { steps } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    await db.agentRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        result: error instanceof Error ? error.message : "Agent run failed",
      },
    });
    throw error;
  }
}

export async function approveAgentRun(runId: string): Promise<void> {
  const run = await db.agentRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "AWAITING_APPROVAL") {
    throw new Error("Run is not awaiting approval");
  }

  const steps = ((run.metadata as { steps?: AgentStep[] })?.steps ?? []) as AgentStep[];
  steps.push({ name: "approval", status: "completed", summary: "Human approved action" });

  const actionNote = run.pendingAction
    ? `\n\n✅ Approved action: ${(run.pendingAction as unknown as ConsequentialAction).action}`
    : "";

  await db.agentRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      result: (run.result ?? "") + actionNote,
      pendingAction: Prisma.JsonNull,
      metadata: { steps, approvedAt: new Date().toISOString() } as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function rejectAgentRun(runId: string): Promise<void> {
  const run = await db.agentRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "AWAITING_APPROVAL") {
    throw new Error("Run is not awaiting approval");
  }

  await db.agentRun.update({
    where: { id: runId },
    data: {
      status: "CANCELED",
      result: (run.result ?? "") + "\n\n❌ Action rejected by user.",
      pendingAction: Prisma.JsonNull,
    },
  });
}
