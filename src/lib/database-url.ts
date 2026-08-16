/**
 * Resolves DATABASE_URL to a standard postgresql:// connection string.
 * Handles prisma+postgres:// URLs from `prisma dev` by decoding the embedded API key.
 */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!url.startsWith("prisma+")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const apiKey = parsed.searchParams.get("api_key");
    if (!apiKey) return url;

    const payloadSegment = apiKey.split(".")[1];
    if (!payloadSegment) return url;

    const payload = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8")
    ) as { databaseUrl?: string };

    if (payload.databaseUrl) {
      return payload.databaseUrl;
    }
  } catch {
    // Fall through to original URL
  }

  return url;
}

export function isPrismaAccelerateUrl(url: string): boolean {
  return url.startsWith("prisma+") || url.startsWith("prisma://");
}
