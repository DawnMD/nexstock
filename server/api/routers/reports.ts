import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { z } from "zod";

/**
 * Reporting.
 *
 * All of these are aggregates over data the app already writes, and most are
 * raw SQL for the same reason `inventory.getByZone` is: they group and join
 * across tables in ways Prisma's query API cannot express, and doing it in JS
 * would mean loading the whole ledger to count it.
 *
 * The interesting one is dock turnaround. `DockActivity` has been recording a
 * timestamp per lifecycle step since the schema was written and nothing has ever
 * read them; the gap between CHECK_IN and CHECK_OUT is how long a vehicle sat on
 * the dock, which is the number a warehouse actually manages.
 */

/** Everything defaults to the last 30 days when no range is given. */
const dateRange = z.object({
  from: z.date().nullish(),
  to: z.date().nullish(),
});

const resolveRange = (input: { from?: Date | null; to?: Date | null }) => {
  const to = input.to ?? new Date();
  const from = input.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

export const reportsRouter = createTRPCRouter({
  /** Units received per day, so the shape of the week is visible. */
  getReceivingThroughput: privateProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      const { from, to } = resolveRange(input);

      return await ctx.db.$queryRaw<
        { day: Date; receipts: number; units: number }[]
      >`
        SELECT date_trunc('day', ri."receivedAt")::date AS "day",
               COUNT(*)::int                            AS "receipts",
               COALESCE(SUM(ri."receivedQuantity"), 0)::int AS "units"
        FROM "ReceiveItem" ri
        WHERE ri."receivedAt" >= ${from} AND ri."receivedAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    }),

  /**
   * How long vehicles spent on the dock, from check-in to check-out.
   *
   * Only vehicles that completed the whole lifecycle are counted — a truck that
   * has checked in and not left yet has no turnaround time, and including it as
   * a partial would drag the average down.
   */
  getDockTurnaround: privateProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      const { from, to } = resolveRange(input);

      return await ctx.db.$queryRaw<
        {
          vehicleNumber: string;
          orderId: string;
          dockName: string;
          checkIn: Date;
          checkOut: Date;
          minutesOnDock: number;
        }[]
      >`
        SELECT db."vehicleNumber",
               db."orderId",
               d."name" AS "dockName",
               ci."createdAt" AS "checkIn",
               co."createdAt" AS "checkOut",
               (EXTRACT(EPOCH FROM (co."createdAt" - ci."createdAt")) / 60)::int
                 AS "minutesOnDock"
        FROM "DockBooking" db
        JOIN "Dock" d ON d."id" = db."dockId"
        JOIN "DockActivity" ci
          ON ci."dockBookingId" = db."id" AND ci."activityType" = 'CHECK_IN'
        JOIN "DockActivity" co
          ON co."dockBookingId" = db."id" AND co."activityType" = 'CHECK_OUT'
        WHERE ci."createdAt" >= ${from} AND ci."createdAt" <= ${to}
        ORDER BY "minutesOnDock" DESC
        LIMIT 100
      `;
    }),

  /**
   * Reject rate by SKU. `rejectedQuantity` over `receivedQuantity` across every
   * line, so a SKU that consistently arrives damaged stands out from one that
   * had a single bad pallet.
   */
  getQualityBySku: privateProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      const { from, to } = resolveRange(input);

      return await ctx.db.$queryRaw<
        {
          sku: string;
          description: string;
          received: number;
          rejected: number;
          rejectRate: number;
          inspections: number;
        }[]
      >`
        SELECT oi."skuId"                                AS "sku",
               s."description",
               COALESCE(SUM(oi."receivedQuantity"), 0)::int AS "received",
               COALESCE(SUM(oi."rejectedQuantity"), 0)::int AS "rejected",
               CASE
                 WHEN COALESCE(SUM(oi."receivedQuantity"), 0) = 0 THEN 0
                 ELSE ROUND(
                   SUM(oi."rejectedQuantity")::numeric
                     / SUM(oi."receivedQuantity")::numeric * 100, 2)
               END::float                                AS "rejectRate",
               COUNT(qc."id")::int                       AS "inspections"
        FROM "OrderItem" oi
        JOIN "Sku" s ON s."sku" = oi."skuId"
        LEFT JOIN "QualityCheck" qc ON qc."orderItemId" = oi."id"
        WHERE oi."updatedAt" >= ${from} AND oi."updatedAt" <= ${to}
        GROUP BY oi."skuId", s."description"
        HAVING COALESCE(SUM(oi."receivedQuantity"), 0) > 0
        ORDER BY "rejectRate" DESC, "received" DESC
        LIMIT 50
      `;
    }),

  /**
   * How long stock has been sitting, bucketed.
   *
   * Age is measured from the receipt that put the pallet in the building, which
   * is why this joins `ReceiveItem` rather than reading `InventoryBalance.updatedAt`
   * — that column moves every time the pallet is touched, so it would report a
   * relocated pallet as brand new.
   */
  getStockAging: privateProcedure.query(async ({ ctx }) => {
    return await ctx.db.$queryRaw<
      { bucket: string; sortKey: number; units: number; pallets: number }[]
    >`
      WITH aged AS (
        SELECT b."quantity",
               b."lpn",
               EXTRACT(DAY FROM (now() - ri."receivedAt"))::int AS "ageDays"
        FROM "InventoryBalance" b
        JOIN "ReceiveItem" ri ON ri."lpn" = b."lpn"
        WHERE b."quantity" > 0
      )
      SELECT CASE
               WHEN "ageDays" < 7  THEN '0-6 days'
               WHEN "ageDays" < 30 THEN '7-29 days'
               WHEN "ageDays" < 90 THEN '30-89 days'
               ELSE '90+ days'
             END AS "bucket",
             CASE
               WHEN "ageDays" < 7  THEN 0
               WHEN "ageDays" < 30 THEN 1
               WHEN "ageDays" < 90 THEN 2
               ELSE 3
             END AS "sortKey",
             SUM("quantity")::int          AS "units",
             COUNT(DISTINCT "lpn")::int    AS "pallets"
      FROM aged
      GROUP BY 1, 2
      ORDER BY 2 ASC
    `;
  }),

  /** Outbound counterpart of receiving throughput. */
  getShippingThroughput: privateProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      const { from, to } = resolveRange(input);

      return await ctx.db.$queryRaw<
        { day: Date; shipments: number; units: number }[]
      >`
        SELECT date_trunc('day', s."shippedAt")::date AS "day",
               COUNT(DISTINCT s."id")::int            AS "shipments",
               COALESCE(SUM(-m."quantity"), 0)::int   AS "units"
        FROM "Shipment" s
        LEFT JOIN "InventoryMovement" m
          ON m."refType" = 'SHIPMENT' AND m."refId" = s."id"::text
        WHERE s."shippedAt" IS NOT NULL
          AND s."shippedAt" >= ${from} AND s."shippedAt" <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `;
    }),

  /**
   * Warehouse utilisation: how full each rack is against its rating.
   *
   * Both ratings are optional on `Location`, so a rack without one reports null
   * rather than 0% — "unrated" and "empty" are different answers.
   */
  getLocationUtilisation: privateProcedure.query(async ({ ctx }) => {
    return await ctx.db.$queryRaw<
      {
        location: string;
        zone: string;
        units: number;
        usedCbm: number | null;
        ratedCbm: number | null;
        utilisation: number | null;
      }[]
    >`
      SELECT l."location",
             l."zone",
             COALESCE(SUM(b."quantity"), 0)::int AS "units",
             CASE WHEN l."cbm" IS NULL THEN NULL
                  ELSE COALESCE(SUM(b."quantity" * s."cbm"), 0)::float END
               AS "usedCbm",
             l."cbm"::float AS "ratedCbm",
             -- Sku.cbm is a Float, so the SUM comes back double precision, and
             -- Postgres has no round(double precision, int) - only the numeric
             -- overload. Both operands are cast before dividing.
             CASE WHEN l."cbm" IS NULL OR l."cbm" = 0 THEN NULL
                  ELSE ROUND(
                    (COALESCE(SUM(b."quantity" * s."cbm"), 0)::numeric
                      / l."cbm"::numeric) * 100, 1)::float END
               AS "utilisation"
      FROM "Location" l
      LEFT JOIN "InventoryBalance" b
        ON b."location" = l."location" AND b."quantity" > 0
      LEFT JOIN "Sku" s ON s."sku" = b."sku"
      WHERE l."status" = true
      GROUP BY l."location", l."zone", l."cbm"
      ORDER BY "utilisation" DESC NULLS LAST, l."location" ASC
      LIMIT 100
    `;
  }),

  /** Headline numbers across the whole period, for the tiles at the top. */
  getSummary: privateProcedure
    .input(dateRange)
    .query(async ({ ctx, input }) => {
      const { from, to } = resolveRange(input);

      const [received, shipped, rejected, onHand] = await Promise.all([
        ctx.db.receiveItem.aggregate({
          where: { receivedAt: { gte: from, lte: to } },
          _sum: { receivedQuantity: true },
          _count: true,
        }),
        ctx.db.shipment.count({
          where: { shippedAt: { gte: from, lte: to } },
        }),
        ctx.db.inventoryMovement.aggregate({
          where: {
            reason: "QC_REJECT",
            createdAt: { gte: from, lte: to },
          },
          _sum: { quantity: true },
        }),
        ctx.db.inventoryBalance.aggregate({
          where: { quantity: { gt: 0 } },
          _sum: { quantity: true },
        }),
      ]);

      return {
        unitsReceived: received._sum.receivedQuantity ?? 0,
        receipts: received._count,
        shipments: shipped,
        // QC_REJECT rows are negative; report the magnitude.
        unitsRejected: Math.abs(rejected._sum.quantity ?? 0),
        unitsOnHand: onHand._sum.quantity ?? 0,
        from,
        to,
      };
    }),
});
