import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { db } from "@/server/db";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // Accounts are minted by `pnpm user:create`, never self-serve. This closes
    // POST /api/auth/sign-up/email as well as hiding a page.
    disableSignUp: true,
    // No mail provider is wired, so a user could never complete verification.
    requireEmailVerification: false,
  },

  session: {
    // Every page render and every tRPC call resolves a session. Without this the
    // app would issue a DB round-trip per request; with it, the session rides in a
    // signed cookie and is re-read from Postgres at most once every 5 minutes.
    // Trade-off: revoking a session can lag by up to `maxAge`.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  // Lets Better Auth set cookies from Server Actions. The app has none today, but
  // this is the documented Next.js baseline and costs nothing.
  plugins: [nextCookies()],
});
