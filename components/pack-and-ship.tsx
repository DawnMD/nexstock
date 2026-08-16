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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { BoxIcon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Packing and shipping share a screen because they are two halves of one job:
 * box what has been picked, then put the boxes on a truck.
 *
 * Packing writes no stock movement — the units are already in the dispatch bay,
 * and a carton records how they are boxed rather than where they are. Shipping
 * is the step that takes them out of the warehouse.
 */
export function PackAndShip({ orderNumber }: { orderNumber: string }) {
  const queryClient = useQueryClient();
  const { data: packList } = useSuspenseQuery(
    orpc.outbound.getPackList.queryOptions({ input: { orderNumber } }),
  );
  const { data: cartons } = useSuspenseQuery(
    orpc.outbound.getUnshippedCartons.queryOptions({
      input: {
        orderNumber,
      },
    }),
  );

  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [cartonNumber, setCartonNumber] = useState("");
  const [cartonWeight, setCartonWeight] = useState("");

  const [selectedCartons, setSelectedCartons] = useState<number[]>([]);
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getPackList.key({ input: { orderNumber } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getUnshippedCartons.key({
          input: { orderNumber },
        }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSalesOrder.key({ input: { orderNumber } }),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSalesOrders.key(),
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.outbound.getSummary.key(),
      }),
      queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
    ]);
  };

  const packCarton = useMutation(
    orpc.outbound.packCarton.mutationOptions({
      onSuccess: async (carton) => {
        await refresh();
        setSelectedTasks([]);
        setCartonNumber("");
        setCartonWeight("");
        toast.success(`Packed carton ${carton.cartonNumber}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const confirmShipment = useMutation(
    orpc.outbound.confirmShipment.mutationOptions({
      onSuccess: async (shipment) => {
        await refresh();
        setSelectedCartons([]);
        setShipmentNumber("");
        setCarrier("");
        setTrackingNumber("");
        toast.success(`Shipment ${shipment.shipmentNumber} dispatched`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const toggle = (
    id: number,
    setter: React.Dispatch<React.SetStateAction<number[]>>,
  ) =>
    setter((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoxIcon className="h-5 w-5" />
            Pack
          </CardTitle>
          <CardDescription>
            Picked lines for {orderNumber} that are not in a carton yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {packList.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing waiting to be packed.
            </p>
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {packList.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => toggle(task.id, setSelectedTasks)}
                    />
                    <Label
                      htmlFor={`task-${task.id}`}
                      className="flex flex-1 flex-wrap items-center gap-2 font-normal"
                    >
                      <span className="font-mono">{task.sku}</span>
                      <Badge variant="outline" className="text-xs">
                        {task.pickedQuantity}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-xs">
                        {task.lpn}
                      </span>
                    </Label>
                  </li>
                ))}
              </ul>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cartonNumber">Carton number</Label>
                  <Input
                    id="cartonNumber"
                    value={cartonNumber}
                    onChange={(e) => setCartonNumber(e.target.value)}
                    placeholder="CTN-0001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cartonWeight">Weight (kg, optional)</Label>
                  <Input
                    id="cartonWeight"
                    type="number"
                    min={0}
                    value={cartonWeight}
                    onChange={(e) => setCartonWeight(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    disabled={
                      packCarton.isPending ||
                      selectedTasks.length === 0 ||
                      cartonNumber.trim().length === 0
                    }
                    onClick={() =>
                      packCarton.mutate({
                        cartonNumber: cartonNumber.trim(),
                        pickTaskIds: selectedTasks,
                        weight:
                          cartonWeight.trim() === ""
                            ? null
                            : Number(cartonWeight),
                      })
                    }
                  >
                    {packCarton.isPending
                      ? "Packing..."
                      : `Pack ${selectedTasks.length} line(s)`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Ship
          </CardTitle>
          <CardDescription>
            Confirming a shipment is the only thing in NexStock that takes stock
            out of the warehouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartons.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No cartons waiting for a truck.
            </p>
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {cartons.map((carton) => (
                  <li
                    key={carton.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Checkbox
                      id={`carton-${carton.id}`}
                      checked={selectedCartons.includes(carton.id)}
                      onCheckedChange={() =>
                        toggle(carton.id, setSelectedCartons)
                      }
                    />
                    <Label
                      htmlFor={`carton-${carton.id}`}
                      className="flex flex-1 flex-wrap items-center gap-2 font-normal"
                    >
                      <span className="font-mono">{carton.cartonNumber}</span>
                      <span className="text-muted-foreground text-xs">
                        {carton.contents.length} line(s),{" "}
                        {carton.contents.reduce(
                          (sum, entry) => sum + entry.pickedQuantity,
                          0,
                        )}{" "}
                        units
                        {carton.weight != null ? ` · ${carton.weight} kg` : ""}
                      </span>
                    </Label>
                  </li>
                ))}
              </ul>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="shipmentNumber">Shipment number</Label>
                  <Input
                    id="shipmentNumber"
                    value={shipmentNumber}
                    onChange={(e) => setShipmentNumber(e.target.value)}
                    placeholder="SHP-0001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="DHL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking (optional)</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
              </div>

              <Button
                disabled={
                  confirmShipment.isPending ||
                  selectedCartons.length === 0 ||
                  shipmentNumber.trim().length === 0 ||
                  carrier.trim().length === 0
                }
                onClick={() =>
                  confirmShipment.mutate({
                    shipmentNumber: shipmentNumber.trim(),
                    orderNumber,
                    carrier: carrier.trim(),
                    trackingNumber: trackingNumber.trim() || undefined,
                    cartonIds: selectedCartons,
                  })
                }
              >
                {confirmShipment.isPending
                  ? "Dispatching..."
                  : `Ship ${selectedCartons.length} carton(s)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
