import { db } from "@/lib/db";

interface AuditLogParams {
  organizationId?: string;
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata as object | undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
