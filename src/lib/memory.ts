import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import type { MemoryType } from "@/generated/prisma/client";

export async function storeMemory(params: {
  organizationId: string;
  userId?: string;
  content: string;
  type?: MemoryType;
  metadata?: Record<string, unknown>;
}) {
  const provider = getAIProvider();
  const embedding = await provider.embed(params.content);
  const embeddingStr = `[${embedding.join(",")}]`;

  const id = crypto.randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO memories (id, "organizationId", "userId", type, content, embedding, metadata, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::"MemoryType", $5, $6::vector, $7::jsonb, NOW(), NOW())`,
    id,
    params.organizationId,
    params.userId ?? null,
    params.type ?? "FACT",
    params.content,
    embeddingStr,
    params.metadata ? JSON.stringify(params.metadata) : null
  );

  return { id, content: params.content, type: params.type ?? "FACT" };
}

export async function searchMemories(
  organizationId: string,
  query: string,
  limit = 5
) {
  const provider = getAIProvider();
  const embedding = await provider.embed(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await db.$queryRawUnsafe<
    Array<{ id: string; content: string; type: string; similarity: number }>
  >(
    `SELECT id, content, type::text, 1 - (embedding <=> $1::vector) as similarity
     FROM memories
     WHERE "organizationId" = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    organizationId,
    limit
  );

  return results;
}

export async function listMemories(organizationId: string, limit = 50) {
  return db.memory.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, content: true, type: true, createdAt: true },
  });
}

export async function deleteMemory(id: string, organizationId: string) {
  return db.memory.deleteMany({ where: { id, organizationId } });
}
