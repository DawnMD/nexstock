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
  // An explicit origin wins when it is set, which is what a deployment on a
  // custom domain (or an end-to-end run on its own port) needs: the allowed-host
  // list below is a fixed set, and Better Auth answers any request from outside
  // it with a 500, so every sign-in fails. Falling back to the list keeps
  // localhost and Vercel previews working with no configuration.
  baseURL: env.BETTER_AUTH_URL ?? {
    allowedHosts: ["localhost:3000", "localhost:5173", "*.vercel.app"],
    protocol: env.NODE_ENV === "development" ? "http" : "https",
  },

  emailAndPassword: {
    enabled: true,
    // Local development defaults to self-serve sign-up. The public résumé
    // deployment disables both this endpoint and the /sign-up page with the
    // same ALLOW_SIGN_UP switch.
    disableSignUp: !env.ALLOW_SIGN_UP,
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
    // Every page render and every oRPC call resolves a session. Without this the
    // app would issue a DB round-trip per request; with it, the session rides in a
    // signed cookie and is re-read from Postgres at most once every 5 minutes.
    // Trade-off: revoking a session can lag by up to `maxAge`.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  // Lets Better Auth set cookies from Server Actions. The app has none today, but
  // this is the documented Next.js baseline and costs nothing.
  plugins: [nextCookies()],
});
