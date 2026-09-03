import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2Icon,
  ClockIcon,
  PackageIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";
import { getItemStatusVariant, formatItemStatus } from "@/lib/order-utils";
import type { AdjustmentType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

interface LineItem {
  id: number;
  sku: string;
  description: string;
  status: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  department: string;
  adjustments: {
    adjustedQuantity: number;
    adjustmentType: AdjustmentType;
  }[];
  qualityCheck?: boolean;
}

interface OrderLineItemsProps {
  lineItems: LineItem[];
}

/** Additions less subtractions, i.e. how far a line has been corrected. */
const netAdjustment = (adjustments: LineItem["adjustments"]) =>
  adjustments.reduce(
    (total, adjustment) =>
      adjustment.adjustmentType === "ADDITION"
        ? total + adjustment.adjustedQuantity
        : total - adjustment.adjustedQuantity,
    0,
  );

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case "NOT_RECEIVED":
      return <ClockIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />;
    case "RECEIVING":
      return <TruckIcon className="h-3 w-3 text-blue-500 dark:text-blue-400" />;
    case "RECEIVED":
      return (
        <CheckCircle2Icon className="h-3 w-3 text-green-500 dark:text-green-400" />
      );
    case "REJECTED":
      return <XCircleIcon className="h-3 w-3 text-white" />;
    default:
      return <ClockIcon className="h-3 w-3 text-gray-500 dark:text-gray-400" />;
  }
};

export function OrderLineItems({ lineItems }: OrderLineItemsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
          <PackageIcon className="h-4 w-4" />
          Line Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Nine columns of quantities do not survive a 360px screen, and this is
            the screen a supervisor opens standing next to the pallet. */}
        <div className="space-y-3 md:hidden">
          {lineItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium">{item.sku}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.description}
                  </p>
                </div>
                <Badge
                  variant={getItemStatusVariant(item.status)}
                  className="flex shrink-0 gap-1 text-xs [&_svg]:h-3 [&_svg]:w-3"
                >
                  {getStatusIcon(item.status)}
                  {formatItemStatus(item.status)}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Ordered
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {item.orderedQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Received
                  </p>
                  <p
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      item.receivedQuantity > item.orderedQuantity &&
                        "text-amber-600 dark:text-amber-500",
                    )}
                  >
                    {item.receivedQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Adjusted
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {netAdjustment(item.adjustments)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Rejected
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {item.rejectedQuantity}
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>{item.department}</span>
                <span>
                  Quality check:{" "}
                  {item.qualityCheck === undefined
                    ? "N/A"
                    : item.qualityCheck
                      ? "Passed"
                      : "Failed"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Adjusted</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Quality Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.sku}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getItemStatusVariant(item.status)}
                      className="flex w-fit gap-1 text-xs [&_svg]:h-3 [&_svg]:w-3"
                    >
                      {getStatusIcon(item.status)}
                      {formatItemStatus(item.status)}
                    </Badge>
                  </TableCell>
                  {/* What the purchase order asked for, unmodified. This used to
                      add the net adjustment on top, but an adjustment moves
                      `receivedQuantity` — `applyAdjustmentBatch` never touches
                      `orderedQuantity` — so the column misreported the order and
                      double-counted the figure already shown under "Adjusted". */}
                  <TableCell className="text-right">
                    {item.orderedQuantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        item.receivedQuantity > item.orderedQuantity
                          ? "font-medium text-amber-600 dark:text-amber-500"
                          : undefined
                      }
                      // Receiving refuses to exceed the ordered quantity, but an
                      // overage adjustment deliberately can — a vendor really
                      // does ship more than the PO says. Flagged rather than
                      // hidden.
                      title={
                        item.receivedQuantity > item.orderedQuantity
                          ? `Over-received by ${item.receivedQuantity - item.orderedQuantity}`
                          : undefined
                      }
                    >
                      {item.receivedQuantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {netAdjustment(item.adjustments)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.rejectedQuantity}
                  </TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>
                    {item.qualityCheck === undefined
                      ? "N/A"
                      : item.qualityCheck
                        ? "Passed"
                        : "Failed"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
