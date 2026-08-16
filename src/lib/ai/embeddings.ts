import { createHash } from "crypto";

const EMBEDDING_DIM = 1536;

/**
 * Local deterministic embedding fallback when no cloud embedding API is configured.
 * Groq does not offer an embeddings endpoint — this enables memory/RAG without OpenAI.
 */
export function localEmbed(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0);
  const normalized = text.toLowerCase().trim();

  if (!normalized) return vector;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const hash = createHash("sha256").update(`${token}:${i % 64}`).digest();
    for (let j = 0; j < hash.length; j++) {
      const idx = (i * hash.length + j) % EMBEDDING_DIM;
      vector[idx] += (hash[j] / 255 - 0.5) * 2;
    }
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export async function embedText(text: string): Promise<number[]> {
  return localEmbed(text);
}
