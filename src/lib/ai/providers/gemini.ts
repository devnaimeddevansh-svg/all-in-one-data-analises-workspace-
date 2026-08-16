import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, ChatParams, ChatResponse } from "../types";

export class GeminiProvider implements AIProvider {
  name = "gemini" as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is required");
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const genModel = this.client.getGenerativeModel({ model: this.model });

    const systemMessage = params.messages.find((m) => m.role === "system");
    const history = params.messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage = params.messages[params.messages.length - 1];
    const chat = genModel.startChat({
      history,
      systemInstruction: systemMessage?.content,
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const content = response.text();

    return {
      content: content ?? "",
      usage: response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount ?? 0,
            completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: response.usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
