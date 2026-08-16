import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { getObjectContent } from "@/lib/storage/s3";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function processDocument(documentId: string): Promise<void> {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");

  await db.document.update({
    where: { id: documentId },
    data: { status: "PROCESSING" },
  });

  try {
    const content = await getObjectContent(doc.storageKey);
    const chunks = chunkText(content);
    const provider = getAIProvider();

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await provider.embed(chunks[i]);
      const embeddingStr = `[${embedding.join(",")}]`;
      const chunkId = crypto.randomUUID();

      await db.$executeRawUnsafe(
        `INSERT INTO document_chunks (id, "documentId", content, "chunkIndex", embedding, "createdAt")
         VALUES ($1, $2, $3, $4, $5::vector, NOW())`,
        chunkId,
        documentId,
        chunks[i],
        i,
        embeddingStr
      );
    }

    await db.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });
  } catch (error) {
    await db.document.update({
      where: { id: documentId },
      data: { status: "FAILED", metadata: { error: String(error) } },
    });
    throw error;
  }
}

export async function searchDocuments(
  organizationId: string,
  query: string,
  limit = 5
) {
  const provider = getAIProvider();
  const embedding = await provider.embed(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      documentId: string;
      documentName: string;
      similarity: number;
    }>
  >(
    `SELECT dc.id, dc.content, dc."documentId", d.name as "documentName",
            1 - (dc.embedding <=> $1::vector) as similarity
     FROM document_chunks dc
     JOIN documents d ON d.id = dc."documentId"
     WHERE d."organizationId" = $2 AND dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    organizationId,
    limit
  );

  return results;
}

export async function listDocuments(organizationId: string) {
  return db.document.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
    },
  });
}
