import { Queue, type Job } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;
let redisAvailable: boolean | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    connection = new IORedis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: () => null,
    });
  }
  return connection;
}

export async function isRedisAvailable(): Promise<boolean> {
  if (redisAvailable !== null) return redisAvailable;
  if (process.env.DISABLE_REDIS === "true") {
    redisAvailable = false;
    return false;
  }
  try {
    const conn = getConnection();
    await conn.connect();
    await conn.ping();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
  return redisAvailable;
}

export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: "document-processing",
  RESEARCH: "research",
  AGENT_RUN: "agent-run",
} as const;

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: getConnection() }));
  }
  return queues.get(name)!;
}

export async function enqueueDocumentProcessing(documentId: string): Promise<boolean> {
  if (!(await isRedisAvailable())) return false;
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  await queue.add(
    "process",
    { documentId },
    { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
  );
  return true;
}

export async function enqueueResearch(projectId: string): Promise<boolean> {
  if (!(await isRedisAvailable())) return false;
  const queue = getQueue(QUEUE_NAMES.RESEARCH);
  await queue.add("research", { projectId }, { attempts: 2 });
  return true;
}

export async function runResearchSync(projectId: string): Promise<void> {
  const { db } = await import("@/lib/db");
  const { runResearchOrchestrator } = await import("@/lib/ai/orchestrator");

  const project = await db.researchProject.findUnique({
    where: { id: projectId },
  });
  if (!project) return;

  await db.researchProject.update({
    where: { id: project.id },
    data: { status: "IN_PROGRESS" },
  });

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
}

export function startWorkers(): void {
  if (process.env.NODE_ENV === "test") return;
  // Workers only start when Redis is available
}
