"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc } from "@/orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { format } from "date-fns";
import { PackageIcon, TruckIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function SalesOrderDetail({ orderNumber }: { orderNumber: string }) {
  const queryClient = useQueryClient();
  const { data: order } = useSuspenseQuery(
    orpc.outbound.getSalesOrder.queryOptions({ input: { orderNumber } }),
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSalesOrder.key({ input: { orderNumber } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSalesOrders.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getPickList.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSummary.key(),
      }),
      queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
    ]);
  };

  const allocate = useMutation(
    orpc.outbound.allocate.mutationOptions({
      onSuccess: async (result) => {
        await refresh();
        const total = result.reduce((sum, line) => sum + line.allocated, 0);
        toast.success(
          total > 0
            ? `Allocated ${total} units across ${result.length} line(s)`
            : "Nothing left to allocate",
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const cancelAllocation = useMutation(
    orpc.outbound.cancelAllocation.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.success("Allocation released");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!order) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center">
          Sales order {orderNumber} not found.
        </CardContent>
      </Card>
    );
  }

  const pending = order.pickTasks.filter((task) => task.status === "PENDING");
  const isCancelled = order.status === "CANCELLED";
  const isShipped = order.status === "SHIPPED";

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono">
              {order.orderNumber}
              <Badge variant="outline">{order.status}</Badge>
            </CardTitle>
            <CardDescription>
              {order.customer.name} ({order.customer.reference})
              {order.requestedShipDate
                ? ` · ship by ${format(order.requestedShipDate, "dd MMM yyyy")}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={allocate.isPending || isCancelled || isShipped}
              onClick={() => allocate.mutate({ orderNumber })}
            >
              {allocate.isPending ? "Allocating..." : "Allocate stock"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={cancelAllocation.isPending || pending.length === 0}
              onClick={() => cancelAllocation.mutate({ orderNumber })}
            >
              Release allocation
            </Button>
            {pending.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                render={<Link href={`/pick?order=${orderNumber}`} />}
                nativeButton={false}
              >
                Pick ({pending.length})
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              render={<Link href={`/ship?order=${orderNumber}`} />}
              nativeButton={false}
            >
              Pack &amp; ship
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
            <PackageIcon className="h-4 w-4" />
            Lines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Picked</TableHead>
                  <TableHead className="text-right">Shipped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.skuRef.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === "SHORT" ? "red" : "secondary"}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.orderedQuantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.allocatedQuantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.pickedQuantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.shippedQuantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {order.pickTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Pick tasks
            </CardTitle>
            <CardDescription>
              Allocation reserves specific pallets, so the picker is told which
              rack to go to rather than just how many units to find.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>LPN</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Picked</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Carton</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.pickTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-mono">{task.sku}</TableCell>
                      <TableCell className="font-mono">
                        {task.fromLocation}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {task.lpn}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {task.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {task.pickedQuantity}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            task.status === "PICKED"
                              ? "green"
                              : task.status === "CANCELLED"
                                ? "secondary"
                                : "blue"
                          }
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {task.carton?.cartonNumber ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {order.shipments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
              <TruckIcon className="h-4 w-4" />
              Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Cartons</TableHead>
                    <TableHead>Shipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono">
                        {shipment.shipmentNumber}
                      </TableCell>
                      <TableCell>{shipment.carrier}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {shipment.trackingNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {shipment.cartons.length}
                      </TableCell>
                      <TableCell>
                        {shipment.shippedAt
                          ? format(shipment.shippedAt, "dd MMM yyyy HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
