import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ensureOrganizationForUser } from "@/lib/org";
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
    id: "credentials",
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
      const password = credentials?.password as string | undefined;

      if (!email || !password) {
        return null;
      }

      const user = await db.user.findUnique({ where: { email } });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
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
      if (!user.id) return true;

      try {
        await ensureOrganizationForUser(user.id, user.name ?? "My Workspace");

        if (account?.provider === "google") {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }
      } catch (error) {
        console.error("signIn callback error:", error);
      }

      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureOrganizationForUser(user.id, user.name ?? "My Workspace");
      }
    },
  },
});
