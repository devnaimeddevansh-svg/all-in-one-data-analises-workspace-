import OpenAI from "openai";
import type { AIProvider, ChatParams, ChatResponse } from "../types";

export class OpenAIProvider implements AIProvider {
  name = "openai" as const;
  private client: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is required");
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  }

  private toOpenAIMessages(messages: ChatParams["messages"]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "tool" as const,
          content: m.content,
          tool_call_id: m.toolCallId ?? "",
        };
      }
      if (m.role === "assistant") {
        return { role: "assistant" as const, content: m.content };
      }
      if (m.role === "system") {
        return { role: "system" as const, content: m.content };
      }
      return { role: "user" as const, content: m.content };
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const tools = params.tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.toOpenAIMessages(params.messages),
      tools: tools?.length ? tools : undefined,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    const toolCalls = choice.message.tool_calls?.map((tc) => {
      if (tc.type !== "function") return null;
      return {
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>,
      };
    }).filter((tc): tc is NonNullable<typeof tc> => tc !== null);

    return {
      content: choice.message.content ?? "",
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  }
}
