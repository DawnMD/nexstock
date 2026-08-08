"use client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { tableFeatureSet, type AppTableFeatures } from "@/lib/table-features";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import {
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const columns: ColumnDef<
  AppTableFeatures,
  inferRouterOutputs<AppRouter>["adjustments"]["getAdjustments"]["items"][number]
>[] = [
  {
    accessorKey: "adjustmentId",
    header: "Adjustment ID",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-6 cursor-pointer"
            render={<Link href={`/adjustments/${row.original.id}`} />}
            nativeButton={false}
          >
            <ExternalLinkIcon className="size-4" />
            <span className="sr-only">View adjustment details</span>
          </Button>
          <div className="font-medium">{row.original.id}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "orderNumber",
    header: "Order Number",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.order.orderNumber}</div>
      );
    },
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.orderItem.Sku.sku}</div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.orderItem.description}</div>
      );
    },
  },
  {
    accessorKey: "adjustedQuantity",
    header: "Adjusted Quantity",
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.adjustedQuantity}</div>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <div className="text-sm">{format(date, "dd MMM yyyy")}</div>;
    },
  },
  {
    accessorKey: "vendorName",
    header: "Vendor Name",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.order.vendor.name}</div>
      );
    },
  },
  {
    accessorKey: "vendorReference",
    header: "Vendor Reference",
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.order.vendor.reference}</div>
      );
    },
  },
  {
    accessorKey: "adjustmentType",
    header: "Adjustment Type",
    cell: ({ row }) => {
      return (
        <Badge
          variant={
            row.original.adjustmentType === "ADDITION"
              ? "secondary"
              : "destructive"
          }
        >
          {row.original.adjustmentType === "ADDITION" ? "Overage" : "Shortage"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.reason ?? "-"}</div>;
    },
  },
];

export function AdjustmentListTable({
  query,
  limit,
  page,
}: {
  query?: string | null;
  limit: number;
  page: number;
}) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // Seeded from the props rather than a fixed 0/20 so the first client query
  // key matches the server prefetch in the adjustments page. The query below
  // reads this state, not the props — otherwise the footer controls would
  // move the table's page while the request kept asking for the original one.
  const [pagination, setPagination] = useState({
    pageIndex: page,
    pageSize: limit,
  });

  const [data] = api.adjustments.getAdjustments.useSuspenseQuery({
    limit: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    search: query,
  });

  const table = useTable({
    features: tableFeatureSet,
    data: data.items,
    columns,
    state: {
      columnFilters,
      pagination,
    },
    manualPagination: true,
    getRowId: (row) => row.id.toString(),
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    rowCount: data.pagination.totalCount,
  });

  return (
    <div className="relative flex flex-col gap-4 overflow-auto">
      <DataTable table={table} columnCount={columns.length} />
      <DataTablePagination
        table={table}
        totalCount={data.pagination.totalCount}
        pageRowCount={data.items.length}
        hasNextPage={data.pagination.hasNextPage}
        hasPreviousPage={data.pagination.hasPreviousPage}
      />
    </div>
  );
}
