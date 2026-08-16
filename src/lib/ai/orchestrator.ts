import { getAIProvider } from "@/lib/ai";
import { TOOL_DEFINITIONS, executeTool, type ToolContext } from "@/lib/ai/tools";
import type { ChatMessage } from "@/lib/ai/types";
import { incrementAiTasks } from "@/lib/usage/tracker";

const SYSTEM_PROMPT_WITH_TOOLS = `You are NexusOS, an AI Operating System that helps users accomplish goals through research, analysis, planning, and execution.

You have access to tools for web search, memory, document search, and human approval for consequential actions.

When helping users:
1. Understand their goal clearly
2. Research and analyze using available tools
3. Provide actionable recommendations with sources when available
4. Store important facts in memory for future reference
5. Request human approval before any consequential external actions

Be concise, insightful, and proactive. Format responses with clear structure using markdown.`;

const SYSTEM_PROMPT_NO_TOOLS = `You are NexusOS, an AI Operating System that helps users accomplish goals through research, analysis, planning, and execution.

When helping users:
1. Understand their goal clearly
2. Provide thoughtful analysis and actionable recommendations
3. Use clear structure with markdown headings and lists when helpful

Be concise, insightful, and proactive.`;

export interface OrchestratorParams {
  organizationId: string;
  userId?: string;
  message: string;
  conversationHistory?: ChatMessage[];
  enableTools?: boolean;
}

export interface OrchestratorResult {
  content: string;
  toolCallsMade: string[];
  pendingApproval?: {
    action: string;
    details: unknown;
  };
}

export async function runOrchestrator(
  params: OrchestratorParams
): Promise<OrchestratorResult> {
  const provider = getAIProvider();
  const toolsEnabled =
    params.enableTools !== false && provider.name !== "groq";
  const context: ToolContext = {
    organizationId: params.organizationId,
    userId: params.userId,
  };

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: toolsEnabled ? SYSTEM_PROMPT_WITH_TOOLS : SYSTEM_PROMPT_NO_TOOLS,
    },
    ...(params.conversationHistory ?? []),
    { role: "user", content: params.message },
  ];

  const toolCallsMade: string[] = [];
  let pendingApproval: OrchestratorResult["pendingApproval"];
  const maxIterations = 5;

  for (let i = 0; i < maxIterations; i++) {
    const response = await provider.chat({
      messages,
      tools: toolsEnabled ? TOOL_DEFINITIONS : undefined,
    });

    await incrementAiTasks(params.organizationId);

    if (!response.toolCalls?.length) {
      return { content: response.content, toolCallsMade, pendingApproval };
    }

    messages.push({ role: "assistant", content: response.content || "" });

    for (const toolCall of response.toolCalls) {
      toolCallsMade.push(toolCall.name);
      const result = await executeTool(toolCall.name, toolCall.arguments, context);

      if (toolCall.name === "request_approval") {
        const parsed = JSON.parse(result) as { action: string; details: unknown };
        pendingApproval = { action: parsed.action, details: parsed.details };
      }

      messages.push({
        role: "tool",
        content: result,
        toolCallId: toolCall.id,
        name: toolCall.name,
      });
    }
  }

  return {
    content: "I've reached the maximum number of tool iterations. Please try a more specific request.",
    toolCallsMade,
    pendingApproval,
  };
}

export async function runResearchOrchestrator(params: {
  organizationId: string;
  userId?: string;
  query: string;
}): Promise<{
  title: string;
  content: string;
  sources: Array<{ title: string; url: string }>;
  recommendations: string[];
}> {
  const provider = getAIProvider();
  const { webSearch } = await import("@/lib/ai/search");

  const searchResults = await webSearch(params.query, 8);
  await incrementAiTasks(params.organizationId);

  const sourcesText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join("\n\n");

  const response = await provider.chat({
    messages: [
      {
        role: "system",
        content: `You are a senior research analyst. Produce comprehensive research reports with:
- Executive Summary
- Key Findings
- Market/Competitive Analysis (if relevant)
- Data & Trends
- Recommendations (numbered list)
- Sources (cite using [n] notation)

Use markdown formatting. Be thorough but concise.`,
      },
      {
        role: "user",
        content: `Research topic: ${params.query}\n\nSources:\n${sourcesText}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 6000,
  });

  await incrementAiTasks(params.organizationId);

  const sources = searchResults
    .filter((r) => r.url)
    .map((r) => ({ title: r.title, url: r.url }));

  const recommendationsMatch = response.content.match(
    /##?\s*Recommendations?\s*\n([\s\S]*?)(?=\n##|\n#|$)/i
  );
  const recommendations = recommendationsMatch
    ? recommendationsMatch[1]
        .split("\n")
        .filter((l) => l.match(/^\d+\.|^[-*]/))
        .map((l) => l.replace(/^\d+\.\s*|^[-*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return {
    title: params.query.slice(0, 100),
    content: response.content,
    sources,
    recommendations,
  };
}
