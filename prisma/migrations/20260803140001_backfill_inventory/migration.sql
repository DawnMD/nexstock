-- Reconstruct the inventory ledger from the history that already exists, so
-- receipts, putaways, rejections and corrections made before Phase 2 aren't
-- stranded outside it.
--
-- Receipts and putaways rebuild exactly: every ReceiveItem row records its
-- quantity, LPN and location, and every Putaway row records both ends of the
-- move. QC rejections and adjustments do not — they were only ever recorded
-- against an OrderItem, which has no location or LPN — so those are replayed as
-- one consolidated correction per line, allocated across the line's pallets
-- oldest-first. That is a reconstruction rather than a replay, and the movement
-- rows say so in `notes`.
--
-- The whole thing is a no-op if any movement already exists, so re-running it is
-- safe.

DO $$
DECLARE
  negative_balances integer;
BEGIN
  IF EXISTS (SELECT 1 FROM "InventoryMovement") THEN
    RAISE NOTICE 'InventoryMovement is not empty, skipping backfill';
    RETURN;
  END IF;

  -- 1. Receipts: the entry point for every unit ever received.
  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  SELECT ri."sku",
         ri."lpn",
         COALESCE(ri."lot", ''),
         ri."location",
         ri."receivedQuantity",
         'RECEIPT',
         'RECEIVE_ITEM',
         ri."id"::text,
         ri."receivedBy",
         ri."receivedAt",
         'Backfilled from receipt history'
  FROM "ReceiveItem" ri
  WHERE ri."receivedQuantity" > 0;

  -- 2. Putaways, as the matched out/in pair they always were.
  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  SELECT p."sku",
         p."lpn",
         COALESCE(ri."lot", ''),
         p."fromLocation",
         -p."quantity",
         'PUTAWAY_OUT',
         'PUTAWAY',
         p."id"::text,
         p."putawayBy",
         p."putawayAt",
         'Backfilled from putaway history'
  FROM "Putaway" p
  JOIN "ReceiveItem" ri ON ri."lpn" = p."lpn"
  WHERE p."quantity" > 0;

  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  SELECT p."sku",
         p."lpn",
         COALESCE(ri."lot", ''),
         p."toLocation",
         p."quantity",
         'PUTAWAY_IN',
         'PUTAWAY',
         p."id"::text,
         p."putawayBy",
         p."putawayAt",
         'Backfilled from putaway history'
  FROM "Putaway" p
  JOIN "ReceiveItem" ri ON ri."lpn" = p."lpn"
  WHERE p."quantity" > 0;

  -- 3. QC rejections, drawn FIFO off whatever the line still has on hand.
  --
  -- `LEAST(qty, GREATEST(0, demand - (running - qty)))` is the standard FIFO
  -- allocation over a running total: each pallet gives up whatever slice of the
  -- demand falls inside its own span of the cumulative sum, and nothing more.
  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  WITH on_hand AS (
    SELECT m."sku", m."lpn", m."lot", m."location", SUM(m."quantity") AS qty
    FROM "InventoryMovement" m
    GROUP BY m."sku", m."lpn", m."lot", m."location"
    HAVING SUM(m."quantity") > 0
  ),
  ranked AS (
    SELECT ri."orderItemId",
           oh.*,
           SUM(oh.qty) OVER (
             PARTITION BY ri."orderItemId"
             ORDER BY ri."receivedAt", ri."id", oh."location"
             ROWS UNBOUNDED PRECEDING
           ) AS running
    FROM on_hand oh
    JOIN "ReceiveItem" ri ON ri."lpn" = oh."lpn"
  ),
  demand AS (
    SELECT oi."id" AS order_item_id,
           oi."rejectedQuantity" AS wanted,
           qc."id" AS quality_check_id,
           qc."inspectedBy",
           qc."inspectedAt"
    FROM "OrderItem" oi
    JOIN "QualityCheck" qc ON qc."orderItemId" = oi."id"
    WHERE oi."rejectedQuantity" > 0
  )
  SELECT r."sku",
         r."lpn",
         r."lot",
         r."location",
         -LEAST(r.qty, GREATEST(0, d.wanted - (r.running - r.qty))),
         'QC_REJECT',
         'QUALITY_CHECK',
         d.quality_check_id::text,
         d."inspectedBy",
         d."inspectedAt",
         'Reconstructed: pre-ledger rejections recorded no location'
  FROM ranked r
  JOIN demand d ON d.order_item_id = r."orderItemId"
  WHERE LEAST(r.qty, GREATEST(0, d.wanted - (r.running - r.qty))) > 0;

  -- 4. Net shortage adjustments, FIFO for the same reason.
  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  WITH on_hand AS (
    SELECT m."sku", m."lpn", m."lot", m."location", SUM(m."quantity") AS qty
    FROM "InventoryMovement" m
    GROUP BY m."sku", m."lpn", m."lot", m."location"
    HAVING SUM(m."quantity") > 0
  ),
  ranked AS (
    SELECT ri."orderItemId",
           oh.*,
           SUM(oh.qty) OVER (
             PARTITION BY ri."orderItemId"
             ORDER BY ri."receivedAt", ri."id", oh."location"
             ROWS UNBOUNDED PRECEDING
           ) AS running
    FROM on_hand oh
    JOIN "ReceiveItem" ri ON ri."lpn" = oh."lpn"
  ),
  net AS (
    SELECT a."orderItemId" AS order_item_id,
           SUM(CASE WHEN a."adjustmentType" = 'ADDITION'
                    THEN a."adjustedQuantity" ELSE -a."adjustedQuantity" END) AS delta,
           MAX(a."id") AS adjustment_id,
           MAX(a."adjustedBy") AS adjusted_by,
           MAX(a."createdAt") AS created_at
    FROM "Adjustment" a
    GROUP BY a."orderItemId"
  )
  SELECT r."sku",
         r."lpn",
         r."lot",
         r."location",
         -LEAST(r.qty, GREATEST(0, -n.delta - (r.running - r.qty))),
         'ADJUSTMENT_SUB',
         'ADJUSTMENT',
         n.adjustment_id,
         n.adjusted_by,
         n.created_at,
         'Reconstructed: net of this line''s pre-ledger adjustments'
  FROM ranked r
  JOIN net n ON n.order_item_id = r."orderItemId"
  WHERE n.delta < 0
    AND LEAST(r.qty, GREATEST(0, -n.delta - (r.running - r.qty))) > 0;

  -- 5. Net overage adjustments land on the line's most recent pallet, matching
  --    what `addToOrderItem` does for a live adjustment.
  INSERT INTO "InventoryMovement"
    ("sku", "lpn", "lot", "location", "quantity", "reason", "refType", "refId", "createdBy", "createdAt", "notes")
  WITH net AS (
    SELECT a."orderItemId" AS order_item_id,
           SUM(CASE WHEN a."adjustmentType" = 'ADDITION'
                    THEN a."adjustedQuantity" ELSE -a."adjustedQuantity" END) AS delta,
           MAX(a."id") AS adjustment_id,
           MAX(a."adjustedBy") AS adjusted_by,
           MAX(a."createdAt") AS created_at
    FROM "Adjustment" a
    GROUP BY a."orderItemId"
    HAVING SUM(CASE WHEN a."adjustmentType" = 'ADDITION'
                    THEN a."adjustedQuantity" ELSE -a."adjustedQuantity" END) > 0
  ),
  latest_receipt AS (
    SELECT DISTINCT ON (ri."orderItemId")
           ri."orderItemId", ri."sku", ri."lpn", COALESCE(ri."lot", '') AS lot, ri."location"
    FROM "ReceiveItem" ri
    ORDER BY ri."orderItemId", ri."receivedAt" DESC, ri."id" DESC
  )
  SELECT lr."sku",
         lr."lpn",
         lr.lot,
         lr."location",
         n.delta,
         'ADJUSTMENT_ADD',
         'ADJUSTMENT',
         n.adjustment_id,
         n.adjusted_by,
         n.created_at,
         'Reconstructed: net of this line''s pre-ledger adjustments'
  FROM net n
  JOIN latest_receipt lr ON lr."orderItemId" = n.order_item_id;

  -- 6. Materialise the balances from the ledger that was just written.
  INSERT INTO "InventoryBalance" ("sku", "location", "lot", "lpn", "quantity", "updatedAt")
  SELECT m."sku", m."location", m."lot", m."lpn", SUM(m."quantity"), NOW()
  FROM "InventoryMovement" m
  GROUP BY m."sku", m."location", m."lot", m."lpn"
  ON CONFLICT ("sku", "location", "lot", "lpn")
  DO UPDATE SET "quantity" = EXCLUDED."quantity", "updatedAt" = NOW();

  -- A negative balance means the reconstruction removed more than it put in,
  -- which would leave the ledger self-inconsistent from day one. Fail loudly
  -- rather than shipping that.
  SELECT COUNT(*) INTO negative_balances
  FROM "InventoryBalance" WHERE "quantity" < 0;

  IF negative_balances > 0 THEN
    RAISE EXCEPTION 'Inventory backfill produced % negative balance(s)', negative_balances;
  END IF;
END $$;
