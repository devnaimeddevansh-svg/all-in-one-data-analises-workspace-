import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: "document-processing",
  RESEARCH: "research",
  AGENT_RUN: "agent-run",
} as const;

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, { connection: getConnection() })
    );
  }
  return queues.get(name)!;
}

export async function enqueueDocumentProcessing(documentId: string): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  await queue.add("process", { documentId }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
}

export async function enqueueResearch(projectId: string): Promise<void> {
  const queue = getQueue(QUEUE_NAMES.RESEARCH);
  await queue.add("research", { projectId }, { attempts: 2 });
}

export function startWorkers(): void {
  if (process.env.NODE_ENV === "test") return;

  new Worker(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job: Job<{ documentId: string }>) => {
      const { processDocument } = await import("@/lib/documents");
      await processDocument(job.data.documentId);
    },
    { connection: getConnection() }
  );

  new Worker(
    QUEUE_NAMES.RESEARCH,
    async (job: Job<{ projectId: string }>) => {
      const { db } = await import("@/lib/db");
      const { runResearchOrchestrator } = await import("@/lib/ai/orchestrator");

      const project = await db.researchProject.findUnique({
        where: { id: job.data.projectId },
      });
      if (!project) return;

      await db.researchProject.update({
        where: { id: project.id },
        data: { status: "IN_PROGRESS" },
      });

      try {
        const result = await runResearchOrchestrator({
          organizationId: project.organizationId,
          userId: project.userId ?? undefined,
          query: project.query,
        });

        await db.researchReport.create({
          data: {
            researchProjectId: project.id,
            title: result.title,
            content: result.content,
            sources: result.sources,
            recommendations: result.recommendations,
          },
        });

        await db.researchProject.update({
          where: { id: project.id },
          data: { status: "COMPLETED" },
        });
      } catch (error) {
        await db.researchProject.update({
          where: { id: project.id },
          data: { status: "FAILED", metadata: { error: String(error) } },
        });
      }
    },
    { connection: getConnection() }
  );
}
