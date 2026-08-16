import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!ratelimit) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "nexusos:ratelimit",
    });
  }
  return ratelimit;
}

const inMemoryCounts = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  identifier: string,
  limit = 60
): Promise<{ success: boolean; remaining: number }> {
  const rl = getRatelimit();
  if (rl) {
    const result = await rl.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  }

  const now = Date.now();
  const entry = inMemoryCounts.get(identifier);
  if (!entry || now > entry.resetAt) {
    inMemoryCounts.set(identifier, { count: 1, resetAt: now + 60000 });
    return { success: true, remaining: limit - 1 };
  }
  entry.count++;
  return { success: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}
