import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatParams, ChatResponse } from "../types";

export class AnthropicProvider implements AIProvider {
  name = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const systemMessage = params.messages.find((m) => m.role === "system");
    const nonSystemMessages = params.messages.filter((m) => m.role !== "system");

    const tools = params.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxTokens ?? 4096,
      system: systemMessage?.content,
      messages: nonSystemMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      tools,
      temperature: params.temperature ?? 0.7,
    });

    let content = "";
    const toolCalls: ChatResponse["toolCalls"] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't have embeddings — fall back to OpenAI if available
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider().embed(text);
    }
    throw new Error("Embeddings require OPENAI_API_KEY when using Anthropic provider");
  }
}
