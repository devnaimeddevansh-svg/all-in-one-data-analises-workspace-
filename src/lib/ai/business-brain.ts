import { getAIProvider } from "@/lib/ai";
import { searchDocuments } from "@/lib/documents";
import type { ChatMessage } from "@/lib/ai/types";
import { incrementAiTasks } from "@/lib/usage/tracker";

export interface DocumentSource {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  similarity: number;
}

export interface BusinessBrainResult {
  content: string;
  sources: DocumentSource[];
}

const SYSTEM_PROMPT = `You are NexusOS Business Brain — an AI analyst that answers questions using the organization's uploaded documents.

Rules:
1. Answer ONLY using the provided document excerpts. If the excerpts don't contain enough information, say so clearly.
2. Cite sources inline using [1], [2], etc. matching the excerpt numbers.
3. Be specific, actionable, and concise.
4. Use markdown formatting with headings and bullet points when helpful.
5. At the end, include a "## Sources" section listing each cited document.`;

export async function runBusinessBrainOrchestrator(params: {
  organizationId: string;
  message: string;
  conversationHistory?: ChatMessage[];
}): Promise<BusinessBrainResult> {
  const provider = getAIProvider();
  const chunks = await searchDocuments(params.organizationId, params.message, 8);

  const sources: DocumentSource[] = chunks.map((c) => ({
    chunkId: c.id,
    documentId: c.documentId,
    documentName: c.documentName,
    content: c.content,
    similarity: c.similarity,
  }));

  const contextBlock =
    sources.length > 0
      ? sources
          .map(
            (s, i) =>
              `[${i + 1}] Document: "${s.documentName}" (chunk ${s.chunkId.slice(0, 8)}…)\n${s.content}`
          )
          .join("\n\n---\n\n")
      : "No relevant document excerpts were found. Inform the user they should upload documents first.";

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(params.conversationHistory ?? []),
    {
      role: "user",
      content: `Document excerpts:\n\n${contextBlock}\n\n---\n\nUser question: ${params.message}`,
    },
  ];

  const response = await provider.chat({
    messages,
    temperature: 0.3,
    maxTokens: 4096,
  });

  await incrementAiTasks(params.organizationId);

  return {
    content: response.content,
    sources,
  };
}
