import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { ensureOrganizationForUser } from "@/lib/org";

const GUEST_COOKIE = "nexusos_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10; // 10 years

export type GuestUser = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function getGuestFromCookie(): Promise<GuestUser | null> {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestId) return null;

  const user = await db.user.findUnique({
    where: { id: guestId },
    select: { id: true, name: true, email: true },
  });
  return user;
}

export async function createGuestUser(): Promise<GuestUser> {
  const suffix = nanoid(10);
  const user = await db.user.create({
    data: {
      name: `Guest ${suffix.slice(0, 6)}`,
      email: `guest-${suffix}@nexusos.local`,
      emailVerified: new Date(),
    },
    select: { id: true, name: true, email: true },
  });

  await ensureOrganizationForUser(user.id, `${user.name}'s Workspace`);
  return user;
}

export async function ensureGuestSession(): Promise<GuestUser> {
  const existing = await getGuestFromCookie();
  if (existing) return existing;
  return createGuestUser();
}

export { GUEST_COOKIE, COOKIE_MAX_AGE };
