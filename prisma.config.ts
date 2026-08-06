import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer loads `.env` implicitly, and this project keeps its
// secrets in `.env.local` (the Next.js convention). Files are listed in
// Next.js' precedence order — dotenv keeps the first value it sees for a key,
// so `.env.local` wins over `.env`.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
