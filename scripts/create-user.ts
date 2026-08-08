/**
 * Creates a Better Auth account directly, skipping the verification email that
 * `/sign-up` requires. Useful for seeding (which needs the printed id) and for
 * deployments that turn self-serve sign-up back off.
 *
 *   pnpm user:create you@example.com "Your Name" "your-password"
 */
import { config as loadEnv } from "dotenv";

// Must run before anything imports `@/env` — Prisma 7 dropped implicit `.env`
// loading and this project keeps secrets in `.env.local`. Same shim as
// `prisma/script-env.ts` and `prisma.config.ts`.
loadEnv({ path: [".env.local", ".env"], quiet: true });

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  throw new Error('Usage: pnpm user:create <email> "<name>" "<password>"');
}

// Dynamic import is load-bearing: a static one would be hoisted above
// `loadEnv()` and `@/env` would throw on the missing DATABASE_URL.
const { auth } = await import("@/lib/auth");

const ctx = await auth.$context;
const user = await ctx.internalAdapter.createUser({
  email,
  name,
  emailVerified: true,
});
await ctx.internalAdapter.createAccount({
  userId: user.id,
  providerId: "credential",
  accountId: user.id,
  password: await ctx.password.hash(password),
});

console.log(`Created ${user.email} (${user.id})`);
