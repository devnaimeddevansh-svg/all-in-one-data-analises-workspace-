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
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "online",
          response_type: "code",
        },
      },
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
        where: { email: (credentials.email as string).toLowerCase().trim() },
      });

      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );
      if (!valid) return null;

      const requireVerification =
        process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
      if (requireVerification && !user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(db),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as { email_verified?: boolean } | undefined;
        if (googleProfile?.email_verified === false) {
          return "/login?error=EmailNotVerified";
        }
      }

      if (user.id) {
        await ensureOrganizationForUser(user.id, user.name ?? "My Workspace");
        if (account?.provider === "google") {
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
        await ensureOrganizationForUser(user.id, user.name ?? "My Workspace");
      }
    },
  },
});
