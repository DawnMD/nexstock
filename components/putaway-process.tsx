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

  // Where this pallet's stock actually is, which is not the same as where it was
  // received. This screen used to send `lpnDetails.location` — the receiving bay,
  // a column that never changes — as the source of every move, so once a pallet
  // had been put away its balance in the bay was 0 and it could never be moved
  // again. `createPutaway` has always supported relocating from storage; nothing
  // in the UI could reach it.
  const sources = lpnDetails.currentLocations;
  const [fromLocation, setFromLocation] = useState<string>(
    () => sources[0]?.location ?? lpnDetails.location,
  );

  const selectedSource = sources.find(
    (balance) => balance.location === fromLocation,
  );
  const available = selectedSource?.quantity ?? 0;
  const onHand = sources.reduce((sum, balance) => sum + balance.quantity, 0);

  const [quantity, setQuantity] = useState<string>(() =>
    String(sources[0]?.quantity ?? 0),
  );
  const parsedQuantity = Number(quantity);
  const quantityIsValid =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= available;

  const handleSourceChange = (location: string) => {
    setFromLocation(location);
    // Default to moving the whole pallet, which is the common case; the operator
    // can still type a smaller number for a split.
    const balance = sources.find((entry) => entry.location === location);
    setQuantity(String(balance?.quantity ?? 0));
    if (toLocation === location) setToLocation("");
  };

  const createPutaway = api.putaway.createPutaway.useMutation({
    onSuccess: async (putaway) => {
      toast.success(
        `Putaway created successfully! ${putaway.quantity} units moved from ${putaway.fromLocation} to ${putaway.toLocation}`,
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
        // The destination's free capacity just changed, and it is shown in this
        // picker.
        apiUtils.putaway.getLocations.invalidate(),
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

    if (!quantityIsValid) {
      toast.error(`Enter a whole quantity between 1 and ${available}`);
      return;
    }

    createPutaway.mutate({
      lpn: lpnDetails.lpn,
      sku: lpnDetails.sku,
      quantity: parsedQuantity,
      fromLocation,
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
                On Hand
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{onHand}</span>
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
              {/* The stock, not the bay it arrived in. `lpnDetails.location` is
                  the receiving location and never changes, so it answered "where
                  is this pallet?" with the wrong place the moment it moved. */}
              <div className="flex flex-col gap-1">
                {sources.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      No stock on hand
                    </span>
                  </div>
                ) : (
                  sources.map((balance) => (
                    <div
                      key={balance.location}
                      className="flex items-center gap-2"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span className="font-mono">{balance.location}</span>
                      <span className="text-muted-foreground text-xs">
                        {balance.quantity}
                      </span>
                    </div>
                  ))
                )}
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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="fromLocation">Move From</Label>
                <Select
                  value={fromLocation}
                  onValueChange={(value) => handleSourceChange(value ?? "")}
                >
                  <SelectTrigger className="w-full" id="fromLocation">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((balance) => (
                      <SelectItem
                        key={balance.location}
                        value={balance.location}
                      >
                        <div className="flex w-full items-center justify-between space-x-4">
                          <span className="font-mono">{balance.location}</span>
                          <span className="text-muted-foreground text-xs">
                            {balance.quantity} on hand
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity to Putaway</Label>
                {/* Editable: `createPutaway` accepts any quantity up to the
                    balance at the source, so a pallet can be split across racks.
                    This was pinned read-only to the full remaining balance. */}
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={available}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  {available} available in {fromLocation}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toLocation">Destination Location</Label>
                <Select
                  value={toLocation}
                  onValueChange={(value) => setToLocation(value ?? "")}
                >
                  <SelectTrigger className="w-full" id="toLocation">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Stock cannot be put away where it already is. */}
                    {locations
                      .filter((location) => location.location !== fromLocation)
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
                  createPutaway.isPending || !toLocation || !quantityIsValid
                }
                className="flex-1"
              >
                {createPutaway.isPending
                  ? "Creating..."
                  : sources.length === 0
                    ? "No stock left on this pallet"
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
