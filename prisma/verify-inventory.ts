/**
 * Phase 2 verification: exercise receive → QC → adjust → putaway against a real
 * database and assert the invariants the inventory core promises.
 *
 * Run with `pnpm tsx prisma/verify-inventory.ts` after a seed. It works on a
 * fresh order line, so it is safe to re-run.
 */
import { PrismaClient } from "../generated/prisma/client";
import { AdjustmentType } from "../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { loadDirectUrl } from "./script-env";
import { applyAdjustmentBatch } from "../server/services/adjustments";
import { createPutaway } from "../server/services/putaway";
import { recordQualityCheck } from "../server/services/quality";
import { receiveStock } from "../server/services/receiving";

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: loadDirectUrl() }),
});
let failures = 0;

/**
 * Who the receipts, QC results, adjustments and putaways written below are
 * attributed to.
 *
 * Those columns are foreign keys onto `User` now, so this script can no longer
 * stamp a literal string. Resolution mirrors `seed.ts`: `--user-id=<id>` or
 * `SEED_USER_ID`, else the synthetic `SYSTEM` user that the
 * `link_audit_columns_to_user` migration guarantees exists.
 */
async function resolveActor(): Promise<string> {
  const flag = process.argv
    .find((arg) => arg.startsWith("--user-id="))
    ?.slice("--user-id=".length);
  const requested = flag ?? process.env.SEED_USER_ID;

  if (requested) {
    const user = await prisma.user.findUnique({ where: { id: requested } });
    if (!user) throw new Error(`No user with id "${requested}".`);
    return user.id;
  }

  const fallback =
    (await prisma.user.findUnique({ where: { id: "SYSTEM" } })) ??
    (await prisma.user.findFirst());
  if (!fallback) {
    throw new Error(
      'No users exist. Run `pnpm user:create you@example.com "Your Name" "your-password"` first.',
    );
  }
  return fallback.id;
}

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`,
  );
}

async function ledgerMatchesBalances() {
  const drift = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT COALESCE(m."ledger", 0) AS ledger, COALESCE(b."quantity", 0) AS balance
      FROM (
        SELECT "sku", "location", "lot", "lpn", SUM("quantity") AS "ledger"
        FROM "InventoryMovement" GROUP BY 1,2,3,4
      ) m
      FULL JOIN "InventoryBalance" b
        ON b."sku" = m."sku" AND b."location" = m."location"
       AND b."lot" = m."lot" AND b."lpn" = m."lpn"
    ) t WHERE t.ledger <> t.balance
  `;
  return Number(drift[0]?.count ?? 0);
}

async function onHandFor(orderItemId: number) {
  const receipts = await prisma.receiveItem.findMany({
    where: { orderItemId },
    select: { lpn: true },
  });
  const balances = await prisma.inventoryBalance.aggregate({
    where: { lpn: { in: receipts.map((r) => r.lpn) } },
    _sum: { quantity: true },
  });
  return balances._sum.quantity ?? 0;
}

async function main() {
  const USER = await resolveActor();

  // A line nothing has been received against yet, so the arithmetic starts at 0.
  const orderItem = await prisma.orderItem.findFirst({
    where: { receivedQuantity: 0, orderedQuantity: { gte: 20 } },
    orderBy: { id: "asc" },
    select: { id: true, skuId: true, orderedQuantity: true },
  });

  if (!orderItem) throw new Error("No unreceived order line to test against");

  const sku = await prisma.sku.findUniqueOrThrow({
    where: { sku: orderItem.skuId },
    select: { uom: true },
  });
  const stamp = Date.now().toString().slice(-8);
  const lpn = `VER${stamp}`;

  console.log(
    `Order line ${orderItem.id} (${orderItem.skuId}), ordered ${orderItem.orderedQuantity}\n`,
  );

  // 1. Receive 20 units.
  await prisma.$transaction((tx) =>
    receiveStock(tx, {
      orderItemId: orderItem.id,
      receivedQuantity: 20,
      sku: orderItem.skuId,
      location: "STAGE",
      lpn,
      uom: sku.uom ?? "EA",
      vehicleNumber: "VERIFY-1",
      receivedBy: USER,
    }),
  );
  check("receipt puts 20 on hand", await onHandFor(orderItem.id), 20);

  // 2. Reject 5 in QC. On-hand drops even though receivedQuantity does not.
  await prisma.$transaction((tx) =>
    recordQualityCheck(tx, {
      orderItemId: orderItem.id,
      inspectedQuantity: 20,
      rejectedQuantity: 5,
      inspectedBy: USER,
    }),
  );
  check("QC rejection removes 5", await onHandFor(orderItem.id), 15);

  // 3. A shortage adjustment of 3.
  const { orderId } = await prisma.orderItem.findUniqueOrThrow({
    where: { id: orderItem.id },
    select: { orderId: true },
  });

  await prisma.$transaction((tx) =>
    applyAdjustmentBatch(tx, {
      adjustedBy: USER,
      adjustments: [
        {
          orderItemId: orderItem.id,
          quantity: 3,
          orderNumber: orderId,
          adjustmentType: AdjustmentType.SUBTRACTION,
        },
      ],
    }),
  );
  check("shortage adjustment removes 3", await onHandFor(orderItem.id), 12);

  // 4. The line's arithmetic: on-hand === received - rejected.
  const line = await prisma.orderItem.findUniqueOrThrow({
    where: { id: orderItem.id },
    select: { receivedQuantity: true, rejectedQuantity: true },
  });
  check(
    "on-hand === receivedQuantity - rejectedQuantity",
    await onHandFor(orderItem.id),
    line.receivedQuantity - line.rejectedQuantity,
  );

  // 5. Putaway is net zero and moves the stock.
  // Roomiest rack first: the capacity check is real, so an arbitrary location
  // may legitimately refuse a full pallet.
  const destination = await prisma.location.findFirstOrThrow({
    where: { status: true, location: { not: "STAGE" } },
    orderBy: [
      { cbm: { sort: "desc", nulls: "first" } },
      { weightCapacity: { sort: "desc", nulls: "first" } },
    ],
    select: { location: true },
  });

  await prisma.$transaction((tx) =>
    createPutaway(tx, {
      lpn,
      sku: orderItem.skuId,
      quantity: 12,
      fromLocation: "STAGE",
      toLocation: destination.location,
      putawayBy: USER,
    }),
  );
  check("putaway is net zero", await onHandFor(orderItem.id), 12);

  const staged = await prisma.inventoryBalance.findFirst({
    where: { lpn, location: "STAGE" },
    select: { quantity: true },
  });
  const stored = await prisma.inventoryBalance.findFirst({
    where: { lpn, location: destination.location },
    select: { quantity: true },
  });
  check("staging bay is empty", staged?.quantity ?? 0, 0);
  check(`stock is in ${destination.location}`, stored?.quantity ?? 0, 12);

  // 6. Over-putaway is refused rather than silently accepted.
  const overPutaway = await prisma
    .$transaction((tx) =>
      createPutaway(tx, {
        lpn,
        sku: orderItem.skuId,
        quantity: 999,
        fromLocation: destination.location,
        toLocation: "STAGE",
        putawayBy: USER,
      }),
    )
    .then(() => "accepted")
    .catch((error: Error) => error.constructor.name);
  check("over-putaway is rejected", overPutaway, "ServiceError");

  // 7. Over-rejection in QC is refused too.
  const overReject = await prisma
    .$transaction((tx) =>
      recordQualityCheck(tx, {
        orderItemId: orderItem.id,
        inspectedQuantity: 20,
        rejectedQuantity: 999,
        inspectedBy: USER,
      }),
    )
    .then(() => "accepted")
    .catch((error: Error) => error.constructor.name);
  check("over-rejection is rejected", overReject, "ServiceError");

  // 8. A location refuses stock it isn't rated to hold. The rating is dropped to
  //    something deliberately impossible and restored afterwards.
  const spare = await prisma.location.findFirstOrThrow({
    where: {
      status: true,
      location: { notIn: ["STAGE", destination.location] },
    },
    select: { location: true, weightCapacity: true },
  });
  await prisma.sku.update({
    where: { sku: orderItem.skuId },
    data: { weight: 100 },
  });
  await prisma.location.update({
    where: { location: spare.location },
    data: { weightCapacity: 1 },
  });

  const overCapacity = await prisma
    .$transaction((tx) =>
      createPutaway(tx, {
        lpn,
        sku: orderItem.skuId,
        quantity: 12,
        fromLocation: destination.location,
        toLocation: spare.location,
        putawayBy: USER,
      }),
    )
    .then(() => "accepted")
    .catch((error: Error) => error.constructor.name);
  check("over-capacity putaway is rejected", overCapacity, "ServiceError");

  await prisma.location.update({
    where: { location: spare.location },
    data: { weightCapacity: spare.weightCapacity },
  });

  check("ledger still matches balances", await ledgerMatchesBalances(), 0);

  const negatives = await prisma.inventoryBalance.count({
    where: { quantity: { lt: 0 } },
  });
  check("no negative balances anywhere", negatives, 0);

  console.log(
    failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
