"use client";

import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

function Empty({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground p-8 text-center text-sm">
      {message}
    </div>
  );
}

function BySkuTable({ search }: { search?: string | null }) {
  const [rows] = api.inventory.getBySku.useSuspenseQuery({ search });

  if (rows.length === 0) {
    return <Empty message="No stock on hand for this search." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
          <TableHead className="hidden lg:table-cell">Department</TableHead>
          <TableHead className="text-right">Placements</TableHead>
          <TableHead className="text-right">On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.sku}>
            <TableCell className="font-mono">
              <Link href={`/inventory/${row.sku}`} className="hover:underline">
                {row.sku}
              </Link>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {row.description}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {row.department}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.placements}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.quantity.toLocaleString()}{" "}
              <span className="text-muted-foreground text-xs">{row.uom}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ByLocationTable({ search }: { search?: string | null }) {
  const [rows] = api.inventory.getByLocation.useSuspenseQuery({ search });

  if (rows.length === 0) {
    return <Empty message="No stock on hand for this search." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Location</TableHead>
          <TableHead className="hidden md:table-cell">Zone</TableHead>
          <TableHead className="hidden md:table-cell">Aisle</TableHead>
          <TableHead className="text-right">Balances</TableHead>
          <TableHead className="text-right">On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.location}>
            <TableCell className="font-mono">
              <span className="flex items-center gap-2">
                {row.location}
                {!row.active && (
                  <Badge variant="outline" className="text-xs">
                    inactive
                  </Badge>
                )}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">{row.zone}</TableCell>
            <TableCell className="hidden md:table-cell">{row.aisle}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.skuCount}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.quantity.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DetailTable({ search }: { search?: string | null }) {
  const [rows] = api.inventory.getBalances.useSuspenseQuery({ search });

  if (rows.length === 0) {
    return <Empty message="No stock on hand for this search." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>LPN</TableHead>
          <TableHead className="hidden md:table-cell">Lot</TableHead>
          <TableHead className="text-right">On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-mono">
              <Link href={`/inventory/${row.sku}`} className="hover:underline">
                {row.sku}
              </Link>
            </TableCell>
            <TableCell className="font-mono">{row.location}</TableCell>
            <TableCell className="font-mono">{row.lpn}</TableCell>
            <TableCell className="hidden font-mono md:table-cell">
              {/* "" is the un-lotted sentinel the balance key uses. */}
              {row.lot === "" ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                row.lot
              )}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.quantity.toLocaleString()}{" "}
              <span className="text-muted-foreground text-xs">
                {row.skuRef.uom ?? "EA"}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ByZoneTable() {
  const [rows] = api.inventory.getByZone.useSuspenseQuery();

  if (rows.length === 0) {
    return <Empty message="No stock on hand." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Zone</TableHead>
          <TableHead className="text-right">Locations</TableHead>
          <TableHead className="text-right">On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.zone}>
            <TableCell className="font-medium">{row.zone}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.locationCount}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {row.quantity.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InventoryViews({ search }: { search?: string | null }) {
  return (
    <Tabs defaultValue="sku" className="w-full">
      <TabsList>
        <TabsTrigger value="sku">By SKU</TabsTrigger>
        <TabsTrigger value="location">By location</TabsTrigger>
        <TabsTrigger value="zone">By zone</TabsTrigger>
        <TabsTrigger value="detail">Detail</TabsTrigger>
      </TabsList>
      <div className="bg-card mt-4 rounded-lg border">
        <TabsContent value="sku">
          <BySkuTable search={search} />
        </TabsContent>
        <TabsContent value="location">
          <ByLocationTable search={search} />
        </TabsContent>
        <TabsContent value="zone">
          <ByZoneTable />
        </TabsContent>
        <TabsContent value="detail">
          <DetailTable search={search} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
