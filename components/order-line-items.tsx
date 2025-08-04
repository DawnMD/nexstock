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
import { getStatusVariant, formatStatusDisplay } from "@/lib/order-utils";
import type { AdjustmentType } from "@prisma/client";

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
        <div className="overflow-hidden rounded-lg border">
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
                      variant={getStatusVariant(item.status)}
                      className="flex w-fit gap-1 text-xs [&_svg]:h-3 [&_svg]:w-3"
                    >
                      {getStatusIcon(item.status)}
                      {formatStatusDisplay(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.orderedQuantity +
                      item.adjustments.reduce(
                        (acc, adjustment) =>
                          adjustment.adjustmentType === "ADDITION"
                            ? acc + adjustment.adjustedQuantity
                            : acc - adjustment.adjustedQuantity,
                        0,
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.receivedQuantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.adjustments.reduce(
                      (acc, adjustment) =>
                        adjustment.adjustmentType === "ADDITION"
                          ? acc + adjustment.adjustedQuantity
                          : acc - adjustment.adjustedQuantity,
                      0,
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.rejectedQuantity}
                  </TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>
                    {item.qualityCheck
                      ? item.qualityCheck === true
                        ? "Passed"
                        : "Failed"
                      : "N/A"}
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
