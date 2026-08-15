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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/trpc/react";
import {
  CheckIcon,
  ClipboardCheckIcon,
  PackageIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type QualityCheckSummary = { qualityCheckStatus: boolean } | null;

/**
 * `qualityCheckStatus` is the pass/fail verdict. Whether a check happened at
 * all is carried by the presence of the record, so a failed inspection has to
 * read differently from one that never ran.
 */
function qcStatusLabel(qualityCheck: QualityCheckSummary) {
  if (!qualityCheck) return "Not Done";
  return qualityCheck.qualityCheckStatus ? "Passed" : "Failed";
}

function qcBadgeVariant(qualityCheck: QualityCheckSummary) {
  if (!qualityCheck) return "blue" as const;
  return qualityCheck.qualityCheckStatus
    ? ("green" as const)
    : ("red" as const);
}

export function QualityCheckItems({ orderNumber }: { orderNumber: string }) {
  const apiUtils = api.useUtils();
  const [orderItems] = api.qualityCheck.getOrderItems.useSuspenseQuery({
    orderNumber,
  });
  const [pendingReset, setPendingReset] = useState<{
    id: number;
    sku: string;
  } | null>(null);

  const resetQualityCheck = api.qualityCheck.resetQualityCheck.useMutation({
    onSuccess: async () => {
      await Promise.all([
        apiUtils.qualityCheck.getOrderItems.invalidate({ orderNumber }),
        apiUtils.qualityCheck.getQualityCheckItems.invalidate(),
        apiUtils.order.getOrderDetailsByOrderNumber.invalidate(),
        // The rejected units are back on their pallets, so the putaway worklist
        // and the inventory screens have both changed.
        apiUtils.putaway.invalidate(),
        apiUtils.inventory.invalidate(),
      ]);
      setPendingReset(null);
      toast.success("Quality check reset — the line can be inspected again");
    },
    onError: (error) => {
      toast.error("Failed to reset the quality check", {
        description: error.message,
      });
    },
  });

  if (!orderItems?.items.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <PackageIcon className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No SKUs Found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            No SKUs found for this order.
          </p>
        </CardContent>
      </Card>
    );
  }
  // Goods can be inspected once a container has been opened. This asks whether
  // *any* vehicle on the order has been opened, not every one: an order split
  // across three trucks used to block QC on all of its lines until the last
  // truck arrived, including lines already received off the first. It also tests
  // for the OPEN activity directly rather than using `activities.length >= 2` as
  // a stand-in for it.
  const isAvailableForQualityCheck = orderItems.dockBookings.some(
    (dockBooking) =>
      dockBooking.activities.some(
        (activity) => activity.activityType === "OPEN",
      ),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {orderItems.items.map((item) => (
        <Card key={item.id} className="relative">
          <CardHeader className="flex items-center gap-2 pb-3">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <PackageIcon className="text-primary h-4 w-4" />
            </div>

            <div>
              <CardTitle className="font-mono text-sm">
                {item.Sku.sku}
              </CardTitle>
              <CardDescription className="text-xs">
                {item.Sku.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SKU Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">QC status:</span>
                <Badge
                  variant={qcBadgeVariant(item.qualityCheck)}
                  className="text-xs"
                >
                  {qcStatusLabel(item.qualityCheck)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <Badge variant="outline" className="text-xs">
                  {item.Sku.department}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordered:</span>
                <span className="font-medium">{item.orderedQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received:</span>
                <span className="font-medium">{item.receivedQuantity}</span>
              </div>
            </div>
            {/* Action Button */}
            {isAvailableForQualityCheck ? (
              <div className="pt-2">
                {/* A QC has happened when the record exists — the boolean on it
                    is the pass/fail verdict, not "was it checked". */}
                {!item.qualityCheck && (
                  <Button
                    size="sm"
                    className="w-full cursor-pointer"
                    render={
                      item.receivedQuantity > 0 ? (
                        <Link
                          href={`/quality-check/${orderNumber}/${item.id}`}
                        />
                      ) : undefined
                    }
                    nativeButton={item.receivedQuantity === 0}
                    disabled={item.receivedQuantity === 0}
                  >
                    <ClipboardCheckIcon className="mr-2 h-3 w-3" />
                    {item.receivedQuantity > 0
                      ? "Start QC"
                      : "Nothing received yet"}
                  </Button>
                )}
                {item.qualityCheck && (
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    <Button
                      size="sm"
                      className="cursor-pointer lg:basis-1/2"
                      variant="outline"
                      disabled
                    >
                      <CheckIcon className="mr-2 h-3 w-3" />
                      Completed
                    </Button>
                    <Button
                      size="sm"
                      className="cursor-pointer lg:basis-1/2"
                      variant={"destructive"}
                      disabled={resetQualityCheck.isPending}
                      onClick={() =>
                        setPendingReset({ id: item.id, sku: item.Sku.sku })
                      }
                    >
                      <RotateCcwIcon className="mr-2 h-3 w-3" />
                      Reset QC
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button size="sm" className="mt-2 w-full cursor-pointer" />
                  }
                >
                  <ClipboardCheckIcon className="mr-2 h-3 w-3" />
                  Start QC
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Unavailable for QC</DialogTitle>
                    <DialogDescription>
                      This SKU is not available for QC. Please check the dock
                      booking and ensure the SKU is available for QC.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={pendingReset !== null}
        onOpenChange={(open) => !open && setPendingReset(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset the check on {pendingReset?.sku}?</DialogTitle>
            <DialogDescription>
              Any units this inspection rejected go back onto the pallets they
              came off, and the line becomes inspectable again. The original
              rejection stays in the movement history alongside its reversal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingReset(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={resetQualityCheck.isPending}
              onClick={() =>
                pendingReset &&
                resetQualityCheck.mutate({ id: pendingReset.id })
              }
            >
              {resetQualityCheck.isPending ? "Resetting..." : "Reset QC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
