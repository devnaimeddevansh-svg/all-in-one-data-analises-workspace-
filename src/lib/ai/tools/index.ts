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
  {
    name: "create_task",
    description: "Create a follow-up task in the task manager",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Task priority",
        },
        dueDate: { type: "string", description: "Due date ISO string" },
      },
      required: ["title"],
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
    case "create_task": {
      const task = await db.task.create({
        data: {
          organizationId: context.organizationId,
          userId: context.userId,
          title: args.title as string,
          description: (args.description as string) ?? undefined,
          priority: (args.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT") ?? "MEDIUM",
          dueDate: args.dueDate ? new Date(args.dueDate as string) : undefined,
        },
      });
      return `Task created: ${task.id}`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
