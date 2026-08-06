import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// `DATABASE_URL` must be Neon's *pooled* connection string (the host contains
// `-pooler`). Migrations run against `DIRECT_URL` instead — see prisma.config.ts.
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }),
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
