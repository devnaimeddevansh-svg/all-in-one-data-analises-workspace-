import type { AIProvider, AIProviderName } from "./types";
import { GroqProvider } from "./providers/groq";

export function getAIProvider(name?: AIProviderName): AIProvider {
  const provider = name ?? (process.env.AI_PROVIDER as AIProviderName) ?? "groq";
  if (provider === "groq") return new GroqProvider();
  throw new Error(
    `Unsupported AI provider "${provider}". Set AI_PROVIDER=groq and configure GROQ_API_KEY.`
  );
}

export function getAvailableProviders(): AIProviderName[] {
  return process.env.GROQ_API_KEY ? ["groq"] : [];
}
