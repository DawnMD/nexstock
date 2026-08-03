"use client";

import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconBox,
  IconCircleCheck,
  IconMapPin,
} from "@tabler/icons-react";

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof IconBox;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-muted rounded-md p-2">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The reconciliation banner is the point of this screen: it asserts, out loud,
 * that the ledger and the balances still agree. Silence would be indistinguishable
 * from nobody checking.
 */
function DriftBanner() {
  const [drift] = api.inventory.getDrift.useSuspenseQuery();

  if (drift.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <IconCircleCheck className="size-4 text-emerald-600 dark:text-emerald-500" />
        Every balance matches the sum of its movements.
      </div>
    );
  }

  return (
    <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
      <div className="flex items-center gap-2 font-medium">
        <IconAlertTriangle className="text-destructive size-4" />
        {drift.length} balance{drift.length === 1 ? "" : "s"} disagree with the
        ledger
      </div>
      <div className="mt-3 space-y-1">
        {drift.slice(0, 10).map((row) => (
          <div
            key={`${row.sku}-${row.location}-${row.lot}-${row.lpn}`}
            className="flex flex-wrap items-center gap-2 font-mono text-xs"
          >
            <Badge variant="outline">{row.sku}</Badge>
            <span className="text-muted-foreground">{row.location}</span>
            <span className="text-muted-foreground">{row.lpn}</span>
            <span>
              ledger {row.ledger} vs balance {row.balance}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventorySummary() {
  const [summary] = api.inventory.getSummary.useSuspenseQuery();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Units on hand"
          value={summary.unitsOnHand.toLocaleString()}
          icon={IconBox}
        />
        <Stat
          label="SKUs in stock"
          value={summary.skuCount.toLocaleString()}
          icon={IconBox}
        />
        <Stat
          label="Locations used"
          value={summary.locationCount.toLocaleString()}
          icon={IconMapPin}
        />
        <Stat
          label="Movements"
          value={summary.movementCount.toLocaleString()}
          icon={IconArrowsExchange}
        />
      </div>
      <DriftBanner />
    </div>
  );
}
