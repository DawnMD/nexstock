"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PackageIcon, MapPinIcon, TruckIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PutawayProcessProps {
  lpn: string;
}

export function PutawayProcess({ lpn }: PutawayProcessProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [toLocation, setToLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [lpnDetails] = api.putaway.getLPNDetails.useSuspenseQuery({ lpn });
  const [locations] = api.putaway.getLocations.useSuspenseQuery();
  const createPutaway = api.putaway.createPutaway.useMutation({
    onSuccess: async () => {
      toast.success(
        `Putaway created successfully! ${lpnDetails.remainingQuantity} units moved from ${lpnDetails.location} to ${toLocation}`,
        {
          description: `LPN: ${lpnDetails.lpn} | SKU: ${lpnDetails.sku}`,
          duration: 5000,
        },
      );
      // The worklist is cached for 30s, so without this the LPN that was just
      // moved is still sitting on /putaway when the redirect lands.
      await Promise.all([
        apiUtils.putaway.getAllLPNs.invalidate(),
        apiUtils.putaway.getLPNDetails.invalidate({ lpn }),
        apiUtils.putaway.searchLPNs.invalidate(),
      ]);
      router.push("/putaway");
    },
    onError: (error) => {
      toast.error("Failed to create putaway", {
        description: error.message,
        duration: 5000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!toLocation) {
      toast.error("Please select a destination location");
      return;
    }

    createPutaway.mutate({
      lpn: lpnDetails.lpn,
      sku: lpnDetails.sku,
      quantity: lpnDetails.remainingQuantity,
      fromLocation: lpnDetails.location,
      toLocation,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* LPN Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            LPN Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                LPN
              </Label>
              <div className="font-mono text-lg">{lpnDetails.lpn}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                SKU
              </Label>
              <div className="font-mono text-lg">{lpnDetails.sku}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Description
              </Label>
              <div className="text-sm">
                {lpnDetails.orderItem.Sku.description}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Quantity
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {lpnDetails.remainingQuantity}
                </span>
                <Badge variant="secondary">{lpnDetails.uom}</Badge>
                {lpnDetails.putawayQuantity > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {lpnDetails.putawayQuantity} of{" "}
                    {lpnDetails.receivedQuantity} already put away
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Current Location
              </Label>
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4" />
                <span>{lpnDetails.location}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Vehicle
              </Label>
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4" />
                <span>{lpnDetails.vehicleNumber}</span>
              </div>
            </div>
          </div>

          {lpnDetails.lot && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-medium">
                  Lot Number
                </Label>
                <div className="font-mono">{lpnDetails.lot}</div>
              </div>
              {lpnDetails.lotExpiryDate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm font-medium">
                    Expiry Date
                  </Label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {
                        new Date(lpnDetails.lotExpiryDate)
                          .toISOString()
                          .split("T")[0]
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Putaway Form */}
      <Card>
        <CardHeader>
          <CardTitle>Putaway Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Putaway</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={lpnDetails.remainingQuantity}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toLocation">Destination Location</Label>
                <Select
                  value={toLocation}
                  onValueChange={(value) => setToLocation(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Stock cannot be put away where it already is. */}
                    {locations
                      .filter(
                        (location) => location.location !== lpnDetails.location,
                      )
                      .map((location) => (
                        <SelectItem
                          key={location.location}
                          value={location.location}
                        >
                          <div className="flex w-full items-center justify-between space-x-4">
                            <span className="font-mono">
                              {location.location}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {location.zone} - {location.aisle}
                              {/* Putaway is refused if the pallet doesn't fit,
                                  so show what's left before it's chosen. */}
                              {location.freeCbm != null &&
                                ` · ${location.freeCbm.toFixed(2)} cbm free`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this putaway operation"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  createPutaway.isPending ||
                  !toLocation ||
                  lpnDetails.remainingQuantity <= 0
                }
                className="flex-1"
              >
                {createPutaway.isPending
                  ? "Creating..."
                  : lpnDetails.remainingQuantity <= 0
                    ? "Fully put away"
                    : "Create Putaway"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/putaway")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
