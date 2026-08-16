import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import type { ToolDefinition } from "@/lib/ai/types";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "web_search",
    description: "Search the web for current information on a topic",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_search",
    description: "Search stored memories for relevant information",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for in memory" },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_store",
    description: "Store important information in persistent memory",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Information to remember" },
        type: {
          type: "string",
          enum: ["PERSONAL", "BUSINESS", "PREFERENCE", "FACT"],
          description: "Memory category",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "document_search",
    description: "Search uploaded documents for relevant content",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for in documents" },
      },
      required: ["query"],
    },
  },
  {
    name: "request_approval",
    description:
      "Request human approval before taking a consequential action (sending emails, making purchases, etc.)",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "Description of the action to approve" },
        details: { type: "object", description: "Action details" },
      },
      required: ["action"],
    },
  },
];

export interface ToolContext {
  organizationId: string;
  userId?: string;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> {
  switch (name) {
    case "web_search": {
      const { webSearch } = await import("@/lib/ai/search");
      const results = await webSearch(args.query as string);
      return JSON.stringify(results, null, 2);
    }
    case "memory_search": {
      const { searchMemories } = await import("@/lib/memory");
      const memories = await searchMemories(
        context.organizationId,
        args.query as string
      );
      return JSON.stringify(memories, null, 2);
    }
    case "memory_store": {
      const { storeMemory } = await import("@/lib/memory");
      const memory = await storeMemory({
        organizationId: context.organizationId,
        userId: context.userId,
        content: args.content as string,
        type: (args.type as "PERSONAL" | "BUSINESS" | "PREFERENCE" | "FACT") ?? "FACT",
      });
      return `Memory stored: ${memory.id}`;
    }
    case "document_search": {
      const { searchDocuments } = await import("@/lib/documents");
      const chunks = await searchDocuments(
        context.organizationId,
        args.query as string
      );
      return JSON.stringify(chunks, null, 2);
    }
    case "request_approval": {
      return JSON.stringify({
        status: "pending_approval",
        action: args.action,
        details: args.details,
        message: "This action requires human approval before proceeding.",
      });
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
