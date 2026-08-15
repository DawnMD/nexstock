/**
 * The test database connection.
 *
 * These tests run against a real Postgres rather than a mocked Prisma client,
 * and that is deliberate. What is being tested here is `SELECT … FOR UPDATE`
 * serialising two concurrent receipts, an atomic `increment` refusing to take a
 * balance negative, `FULL JOIN` reconciliation, and transaction rollback. A mock
 * would assert that the code calls the functions it calls, which proves nothing
 * about any of that.
 *
 * The app itself talks to Neon over WebSockets via `@prisma/adapter-neon`; that
 * adapter needs a Neon endpoint or a WebSocket proxy, so tests use
 * `@prisma/adapter-pg` against plain Postgres instead. Only the transport
 * differs — the services take a `Prisma.TransactionClient` and never know which
 * adapter produced it.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  "postgresql://postgres@localhost:5433/nexstock_test";

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/**
 * Wipe everything the warehouse flows write, children first so the `Restrict`
 * foreign keys are satisfied. `User` is deliberately left alone — the audit
 * columns point at it and the fixtures reuse one actor across the suite.
 */
export async function resetWarehouse() {
  await db.inventoryBalance.deleteMany();
  await db.inventoryMovement.deleteMany();
  await db.putaway.deleteMany();
  await db.adjustment.deleteMany();
  await db.receiveItem.deleteMany();
  await db.qualityCheck.deleteMany();
  await db.orderItem.deleteMany();
  await db.dockActivity.deleteMany();
  await db.dockBooking.deleteMany();
  await db.order.deleteMany();
  await db.sku.deleteMany();
  await db.vendor.deleteMany();
  await db.vehicleType.deleteMany();
  await db.dock.deleteMany();
  await db.location.deleteMany();
}

/**
 * The reconciliation the whole inventory core rests on, as an assertion.
 *
 * This is the same query `inventory.getDrift` serves to the UI: sum the ledger
 * per (sku, location, lot, lpn) and compare it with the materialised balance.
 * Every test that moves stock finishes by calling this, so any flow that writes
 * one without the other fails loudly rather than quietly drifting.
 */
export async function findDrift() {
  return await db.$queryRaw<
    {
      sku: string;
      location: string;
      lot: string;
      lpn: string;
      ledger: number;
      balance: number;
    }[]
  >`
    SELECT COALESCE(m."sku", b."sku")           AS "sku",
           COALESCE(m."location", b."location") AS "location",
           COALESCE(m."lot", b."lot")           AS "lot",
           COALESCE(m."lpn", b."lpn")           AS "lpn",
           COALESCE(m."ledger", 0)::int         AS "ledger",
           COALESCE(b."quantity", 0)::int       AS "balance"
    FROM (
      SELECT "sku", "location", "lot", "lpn", SUM("quantity") AS "ledger"
      FROM "InventoryMovement"
      GROUP BY "sku", "location", "lot", "lpn"
    ) m
    FULL JOIN "InventoryBalance" b
      ON b."sku" = m."sku"
     AND b."location" = m."location"
     AND b."lot" = m."lot"
     AND b."lpn" = m."lpn"
    WHERE COALESCE(m."ledger", 0) <> COALESCE(b."quantity", 0)
  `;
}
