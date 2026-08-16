import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Pick the Prisma driver adapter that matches the connection string.
 *
 * Neon's serverless driver talks over WebSockets to a Neon endpoint, so it
 * cannot reach a local `postgres` at all without a proxy in front of it. That
 * made a Neon account a hard requirement just to run the app or the seed, and
 * made end-to-end tests impossible to run in CI. The connection string already
 * says which database is being addressed, so it is what decides.
 *
 * Shared by `server/db.ts` and the standalone scripts under `prisma/` so the two
 * cannot disagree about which adapter a given URL calls for.
 */
export function createAdapter(connectionString: string) {
  return connectionString.includes("neon.tech")
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
}
