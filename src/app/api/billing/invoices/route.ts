import { NextResponse } from "next/server";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { getPaymentHistory } from "@/lib/stripe";

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();
    const invoices = await getPaymentHistory(organization.id);
    return NextResponse.json({ invoices });
  } catch (error) {
    return handleApiError(error);
  }
}
