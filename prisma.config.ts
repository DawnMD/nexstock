import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads `.env` implicitly, and this project keeps its
// secrets in `.env.local` (the Next.js convention). Files are listed in
// Next.js' precedence order — dotenv keeps the first value it sees for a key,
// so `.env.local` wins over `.env`.
loadEnv({ path: [".env.local", ".env"], quiet: true });

// Migrations and introspection go over Neon's direct (non-pooled) connection;
// PgBouncer can't run the DDL and advisory locks they need.
//
// Read through `process.env` rather than Prisma's `env()` helper, and omit the
// datasource entirely when it is unset: `env()` throws at config-load time, and
// this file is loaded by *every* Prisma command — including the `prisma
// generate` that `postinstall` runs. A fresh clone has no `.env` yet, so the
// throwing version failed `pnpm install` before the README could tell anyone to
// copy `.env.example`. `generate` doesn't need a database; the commands that do
// (`migrate`, `db push`, `studio`) still fail loudly, just with Prisma's own
// "no datasource" message instead of a stack trace during install.
const runtimeUrl = process.env.DATABASE_URL;
const runtimeHost = runtimeUrl ? new URL(runtimeUrl).hostname : undefined;
const isLocalPostgres =
  runtimeHost === "localhost" ||
  runtimeHost === "127.0.0.1" ||
  runtimeHost === "::1";
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  (isLocalPostgres ? runtimeUrl : undefined);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
});
