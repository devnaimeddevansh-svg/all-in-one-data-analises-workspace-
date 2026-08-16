import { NextResponse } from "next/server";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { getUsageSummary } from "@/lib/usage/tracker";

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();
    const usage = await getUsageSummary(organization.id);
    return NextResponse.json(usage);
  } catch (error) {
    return handleApiError(error);
  }
}
