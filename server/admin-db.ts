import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { createAdapter } from "@/lib/prisma-adapter";
import { env } from "@/env";

export function createAdminDb() {
  const directUrl = env.DATABASE_URL_UNPOOLED;
  if (!directUrl && env.DATABASE_URL.includes("neon.tech")) {
    throw new Error(
      "DATABASE_URL_UNPOOLED is required for demo resets on Neon.",
    );
  }

  return new PrismaClient({
    adapter: createAdapter(directUrl ?? env.DATABASE_URL),
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}
