import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    /** Neon pooled connection string (host contains `-pooler`). */
    DATABASE_URL: z.string().url(),
    /** Neon direct connection string, used by the Prisma CLI for migrations. */
    DATABASE_URL_UNPOOLED: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /** 32+ char random string signing session cookies. `npx auth@latest secret` generates one. */
    BETTER_AUTH_SECRET: z.string().min(32),
    /**
     * Public origin Better Auth should treat as its own, e.g.
     * `https://nexstock.example.com`. Set this when the app is served from
     * anywhere other than `localhost:3000` or a `*.vercel.app` domain —
     * without it, Better Auth rejects the request as an unknown host and every
     * sign-in returns a 500. Optional; the allowed-host defaults in
     * `lib/auth.ts` cover local development and Vercel previews.
     */
    BETTER_AUTH_URL: z.string().url().optional(),
    /** Resend API key. Sign-up is gated on email verification, so mail must work. */
    RESEND_API_KEY: z.string().min(1),
    /**
     * `From` header on every outbound mail, e.g. `NexStock <no-reply@yourdomain.com>`.
     * The domain has to be verified in Resend; the default only delivers to the
     * address that owns the Resend account, which is enough for local work.
     */
    EMAIL_FROM: z.string().min(1).default("NexStock <onboarding@resend.dev>"),
    /** Public origin of this deployment. Optional locally; required in production. */
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    NODE_ENV: process.env.NODE_ENV,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
  extends: [vercel()],
});
