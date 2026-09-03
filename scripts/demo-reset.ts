import "server-only";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const { createAdminDb } = await import("@/server/admin-db");
const { env } = await import("@/env");
const { resetDemoWarehouse } = await import("@/server/services/demo-reset");

const db = createAdminDb();

try {
  const account = await db.user.findUnique({
    where: { email: env.DEMO_ACCOUNT_EMAIL.toLowerCase() },
    select: { id: true },
  });
  if (!account) {
    throw new Error("Demo account not found. Run pnpm demo:provision first.");
  }

  const result = await resetDemoWarehouse(db, { actorId: account.id });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await db.$disconnect();
}
