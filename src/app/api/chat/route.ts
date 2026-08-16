import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError, withRateLimit } from "@/lib/api-auth";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { checkAiTaskLimit } from "@/lib/usage/tracker";

const schema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  return withRateLimit("chat", async () => {
    try {
      const { user, organization } = await requireAuthWithOrg();
      const body = await request.json();
      const { message, conversationId } = schema.parse(body);

      await checkAiTaskLimit(organization.id);

      let conversation;
      if (conversationId) {
        conversation = await db.conversation.findFirst({
          where: { id: conversationId, organizationId: organization.id },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
        });
        if (!conversation) {
          return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }
      } else {
        conversation = await db.conversation.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            title: message.slice(0, 100),
            type: "GENERAL",
          },
          include: { messages: true },
        });
      }

      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: message,
        },
      });

      const history = conversation.messages.map((m) => ({
        role: m.role.toLowerCase() as "user" | "assistant" | "system",
        content: m.content,
      }));

      const result = await runOrchestrator({
        organizationId: organization.id,
        userId: user.id,
        message,
        conversationHistory: history,
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: result.content,
          metadata: { toolCallsMade: result.toolCallsMade },
        },
      });

      return NextResponse.json({
        conversationId: conversation.id,
        content: result.content,
        toolCallsMade: result.toolCallsMade,
        pendingApproval: result.pendingApproval,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
