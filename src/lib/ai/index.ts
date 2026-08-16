import type { AIProvider, AIProviderName } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";

export function getAIProvider(name?: AIProviderName): AIProvider {
  const provider = name ?? (process.env.AI_PROVIDER as AIProviderName) ?? "openai";

  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export function getAvailableProviders(): AIProviderName[] {
  const available: AIProviderName[] = [];
  if (process.env.OPENAI_API_KEY) available.push("openai");
  if (process.env.ANTHROPIC_API_KEY) available.push("anthropic");
  if (process.env.GEMINI_API_KEY) available.push("gemini");
  return available;
}
