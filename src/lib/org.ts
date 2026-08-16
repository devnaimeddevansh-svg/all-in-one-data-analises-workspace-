import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { MembershipRole } from "@/generated/prisma/client";

export async function getUserOrganization(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: { subscription: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return membership;
}

export async function createOrganizationForUser(
  userId: string,
  name: string
) {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let attempt = 0;

  while (await db.organization.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const org = await db.organization.create({
    data: {
      name,
      slug,
      memberships: {
        create: { userId, role: "OWNER" },
      },
      subscription: {
        create: { plan: "FREE", status: "ACTIVE" },
      },
    },
    include: { subscription: true },
  });

  return org;
}

export async function requireOrgAccess(
  userId: string,
  organizationId: string,
  minRole: MembershipRole = "MEMBER"
): Promise<boolean> {
  const membership = await db.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!membership) return false;

  const roleHierarchy: Record<MembershipRole, number> = {
    MEMBER: 0,
    ADMIN: 1,
    OWNER: 2,
  };

  return roleHierarchy[membership.role] >= roleHierarchy[minRole];
}
