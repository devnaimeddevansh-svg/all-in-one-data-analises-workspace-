import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthWithOrg, handleApiError } from "@/lib/api-auth";
import { listDocuments } from "@/lib/documents";
import { getUploadUrl, generateStorageKey } from "@/lib/storage/s3";
import { checkStorageLimit, incrementStorage } from "@/lib/usage/tracker";
import { enqueueDocumentProcessing } from "@/lib/queue";

const ALLOWED_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
];

const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  sizeBytes: z.number().positive().max(50 * 1024 * 1024),
});

export async function GET() {
  try {
    const { organization } = await requireAuthWithOrg();
    const documents = await listDocuments(organization.id);
    return NextResponse.json({
      documents: documents.map((d) => ({
        ...d,
        sizeBytes: Number(d.sizeBytes),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, organization } = await requireAuthWithOrg();
    const body = await request.json();
    const { filename, mimeType, sizeBytes } = uploadSchema.parse(body);

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    await checkStorageLimit(organization.id, sizeBytes);

    const storageKey = generateStorageKey(organization.id, filename);
    const uploadUrl = await getUploadUrl(storageKey, mimeType);

    const document = await db.document.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        name: filename,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        storageKey,
        status: "PENDING",
      },
    });

    await incrementStorage(organization.id, sizeBytes);

    return NextResponse.json({
      documentId: document.id,
      uploadUrl,
      storageKey,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { organization } = await requireAuthWithOrg();
    const body = await request.json();
    const { documentId } = z.object({ documentId: z.string() }).parse(body);

    const doc = await db.document.findFirst({
      where: { id: documentId, organizationId: organization.id },
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await enqueueDocumentProcessing(documentId);
    } catch {
      const { processDocument } = await import("@/lib/documents");
      await processDocument(documentId);
    }

    return NextResponse.json({ message: "Processing started" });
  } catch (error) {
    return handleApiError(error);
  }
}
