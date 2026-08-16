import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createOrganizationForUser } from "@/lib/org";
import { authConfig } from "./config";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await db.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );
      if (!valid) return null;

      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.id) {
        const membership = await db.membership.findFirst({
          where: { userId: user.id },
        });
        if (!membership) {
          await createOrganizationForUser(user.id, user.name ?? "My Workspace");
        }
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (dbUser && !dbUser.emailVerified) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        const existing = await db.membership.findFirst({
          where: { userId: user.id },
        });
        if (!existing) {
          await createOrganizationForUser(user.id, user.name ?? "My Workspace");
        }
      }
    },
  },
});
