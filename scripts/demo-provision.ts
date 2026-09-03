import "server-only";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { auth } = await import("@/lib/auth");
const { db } = await import("@/server/db");
const { env } = await import("@/env");
const { createAdminDb } = await import("@/server/admin-db");
const { resetDemoWarehouse } = await import("@/server/services/demo-reset");

const ctx = await auth.$context;
const email = env.DEMO_ACCOUNT_EMAIL.toLowerCase();
const passwordHash = await ctx.password.hash(env.DEMO_ACCOUNT_PASSWORD);
const existing = await ctx.internalAdapter.findUserByEmail(email, {
  includeAccounts: true,
});

let user = existing?.user;
if (user) {
  user = await ctx.internalAdapter.updateUser(user.id, {
    name: "NexStock Demo",
    emailVerified: true,
  });

  const credential = existing?.accounts.find(
    (account) => account.providerId === "credential",
  );
  if (credential) {
    await ctx.internalAdapter.updatePassword(user.id, passwordHash);
  } else {
    await ctx.internalAdapter.createAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    });
  }
} else {
  user = await ctx.internalAdapter.createUser({
    email,
    name: "NexStock Demo",
    emailVerified: true,
  });
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: passwordHash,
  });
}

await db.user.update({
  where: { id: user.id },
  data: { isDemo: true },
});

const adminDb = createAdminDb();
try {
  const result = await resetDemoWarehouse(adminDb, { actorId: user.id });
  console.log(
    `Provisioned ${email} (${user.id}) as the verified demo account.`,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await adminDb.$disconnect();
  await db.$disconnect();
}
