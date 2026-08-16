import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";
import { createAdapter } from "@/lib/prisma-adapter";

// Against Neon, `DATABASE_URL` must be the *pooled* connection string (the host
// contains `-pooler`). Migrations run against `DATABASE_URL_UNPOOLED` instead —
// see prisma.config.ts. `createAdapter` picks the driver from the URL, so a
// local Postgres works here too.
const createPrismaClient = () =>
  new PrismaClient({
    adapter: createAdapter(env.DATABASE_URL),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
