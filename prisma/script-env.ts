/**
 * Env loading for the standalone scripts in this folder.
 *
 * Prisma 7 dropped implicit `.env` loading, and these scripts run under plain
 * `tsx` rather than Next.js, so nothing else populates `process.env` for them.
 * Files are listed in Next.js' precedence order — dotenv keeps the first value
 * it sees for a key, so `.env.local` wins over `.env`.
 */
import { config as loadEnv } from "dotenv";

/**
 * The connection string these scripts should use.
 *
 * They run long, interactive transactions, which Neon's pooled endpoint
 * (PgBouncer in transaction mode) handles poorly, so prefer `DATABASE_URL_UNPOOLED` and
 * fall back to `DATABASE_URL` for non-Neon databases where only one is set.
 */
export function loadDirectUrl(): string {
  loadEnv({ path: [".env.local", ".env"], quiet: true });

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Neither DATABASE_URL_UNPOOLED nor DATABASE_URL is set. Add them to .env.local before running this script.",
    );
  }
  return url;
}
