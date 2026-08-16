import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { listMemories, storeMemory, searchMemories } from "@/lib/memory";

const createSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(["PERSONAL", "BUSINESS", "PREFERENCE", "FACT"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { organization } = await requireAuthWithOrg();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (query) {
      const results = await searchMemories(organization.id, query);
      return NextResponse.json({ memories: results });
    }

    const memories = await listMemories(organization.id);
    return NextResponse.json({ memories });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const body = await request.json();
    const data = createSchema.parse(body);

    const memory = await storeMemory({
      organizationId: organization.id,
      userId: user.id,
      content: data.content,
      type: data.type,
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
