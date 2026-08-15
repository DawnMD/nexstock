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

const args = process.argv.slice(2);
// `--demo` marks the account read-only: it can browse every screen and every
// mutation is refused server-side. This is what the public demo signs in as.
const isDemo = args.includes("--demo");
const [email, name, password] = args.filter((arg) => arg !== "--demo");
if (!email || !name || !password) {
  throw new Error(
    'Usage: pnpm user:create <email> "<name>" "<password>" [--demo]',
  );
}

// Dynamic import is load-bearing: a static one would be hoisted above
// `loadEnv()` and `@/env` would throw on the missing DATABASE_URL.
//
// This pulls in `lib/email.ts`, which is marked `server-only`. That package
// resolves to a module that throws unless the `react-server` export condition is
// set, which Next does and plain Node does not — so this script threw on import
// and `pnpm user:create` could not run at all. The npm script passes
// `--conditions=react-server` to tsx; run it that way rather than with bare
// `tsx` if invoking it directly.
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

if (isDemo) {
  const { db } = await import("@/server/db");
  await db.user.update({ where: { id: user.id }, data: { isDemo: true } });
}

console.log(
  `Created ${user.email} (${user.id})${isDemo ? " — read-only demo account" : ""}`,
);
