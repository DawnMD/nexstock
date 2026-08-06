/**
 * Env loading for the standalone scripts in this folder.
 *
 * Prisma 7 dropped implicit `.env` loading, and these scripts run under plain
 * `tsx` rather than Next.js, so nothing else populates `process.env` for them.
 * Files are listed in Next.js' precedence order — dotenv keeps the first value
 * it sees for a key, so `.env.local` wins over `.env`.
 */
import { config as loadEnv } from "dotenv";

export function loadDatabaseUrl(): string {
  loadEnv({ path: [".env.local", ".env"], quiet: true });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local before running this script.",
    );
  }
  return url;
}
