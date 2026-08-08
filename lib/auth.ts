import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/email-templates";
import { db } from "@/server/db";

/** Lifetime of a verification link. Repeated in the email copy. */
const VERIFICATION_TOKEN_TTL_SECONDS = 60 * 60;

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: {
		allowedHosts: [
			"localhost:3000",
			"localhost:5173",
			"*.vercel.app",
		],
		protocol: env.NODE_ENV === "development" ? "http" : "https",
	},

  emailAndPassword: {
    enabled: true,
    // Self-serve sign-up at /sign-up. The only gate is the verification email
    // below — anyone who controls a mailbox can create an account, so put this
    // deployment behind a network boundary if that is not acceptable.
    disableSignUp: false,
    minPasswordLength: 8,
    // No session until the address is confirmed. This also makes Better Auth
    // return a generic success for a sign-up against an existing email, so the
    // form cannot be used to enumerate accounts.
    requireEmailVerification: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    // An operator who signs in before clicking the link gets a fresh one instead
    // of a dead end.
    sendOnSignIn: true,
    // Clicking the link is proof enough; drop them straight into the app.
    autoSignInAfterVerification: true,
    expiresIn: VERIFICATION_TOKEN_TTL_SECONDS,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(
        verificationEmail({
          to: user.email,
          name: user.name,
          url,
          expiresInHours: VERIFICATION_TOKEN_TTL_SECONDS / 3600,
        }),
      );
    },
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
