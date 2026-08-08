"use client";

import { SearchForm } from "@/components/order-search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { tableFeatureSet, type AppTableFeatures } from "@/lib/table-features";
import { getStatusVariant } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { OrderStatus } from "@/generated/prisma/enums";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  useTable,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  ColumnsIcon,
  CopyIcon,
  ExternalLinkIcon,
  PlusCircleIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.NEW:
      return (
        <PlusCircleIcon className="size-3 text-blue-500 dark:text-blue-400" />
      );
    case OrderStatus.IN_PROGRESS:
      return (
        <ClockIcon className="size-3 text-yellow-500 dark:text-yellow-400" />
      );
    case OrderStatus.COMPLETED:
      return (
        <CheckCircle2Icon className="size-3 text-green-500 dark:text-green-400" />
      );
    case OrderStatus.CANCELLED:
      return <XCircleIcon className="size-3 text-red-500 dark:text-red-400" />;
    default:
      return <ClockIcon className="size-3 text-gray-500 dark:text-gray-400" />;
  }
};

const formatStatusDisplay = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.NEW:
      return "New";
    case OrderStatus.IN_PROGRESS:
      return "In Progress";
    case OrderStatus.COMPLETED:
      return "Completed";
    case OrderStatus.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
};

const columns: ColumnDef<
  AppTableFeatures,
  inferRouterOutputs<AppRouter>["order"]["getPaginatedOrders"]["items"][number]
>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order Number",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-6 cursor-pointer"
            render={<Link href={`/orders/${row.original.orderNumber}`} />}
            nativeButton={false}
          >
            <ExternalLinkIcon className="size-4" />
            <span className="sr-only">View order details</span>
          </Button>
          <div className="font-medium">{row.original.orderNumber}</div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-6 cursor-pointer"
            onClick={() => {
              void navigator.clipboard.writeText(row.original.orderNumber);
              toast.info("Order number copied to clipboard");
            }}
          >
            <CopyIcon className="size-4" />
          </Button>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "businessUnit",
    header: "Business Unit",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.businessUnit}</div>
    ),
  },
  {
    accessorKey: "orderType",
    header: "Order Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="px-2 py-1 text-xs">
        {row.original.orderType}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={getStatusVariant(row.original.status)}
        className="flex w-fit gap-1 px-2 py-1 text-xs [&_svg]:size-3"
      >
        {getStatusIcon(row.original.status)}
        {formatStatusDisplay(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => {
      if (!row.original.purchaseOrderDate) {
        return <div className="text-muted-foreground text-sm">-</div>;
      }
      const date = new Date(row.original.purchaseOrderDate);
      return <div className="text-sm">{format(date, "dd MMM yyyy")}</div>;
    },
  },
  {
    accessorKey: "receiptDate",
    header: "Expected Receipt Date",
    cell: ({ row }) => {
      if (!row.original.expectedReceiptDate) {
        return <div className="text-muted-foreground text-sm">-</div>;
      }
      const date = new Date(row.original.expectedReceiptDate);
      return <div className="text-sm">{format(date, "dd MMM yyyy")}</div>;
    },
  },
  {
    accessorKey: "vendorName",
    header: "Vendor Name",
    cell: ({ row }) => {
      return <div className="font-medium">{row.original.vendor.name}</div>;
    },
  },
  {
    accessorKey: "vendorRef",
    header: "Vendor Ref",
    cell: ({ row }) => {
      return (
        <div className="font-mono text-sm">{row.original.vendor.reference}</div>
      );
    },
  },
];

export function OrderTable({ query }: { query?: string | null }) {
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // Use suspense query for proper loading states
  const [data] = api.order.getPaginatedOrders.useSuspenseQuery({
    limit: pagination.pageSize,
    pageIndex: pagination.pageIndex,
    search: query,
  });

  const table = useTable({
    features: tableFeatureSet,
    data: data.items ?? [],
    columns,
    state: {
      columnVisibility,
      columnFilters,
      pagination,
    },
    manualPagination: true,
    getRowId: (row) => row.id.toString(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    rowCount: data.pagination.totalCount,
  });

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchForm query={query} action="/orders" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ColumnsIcon />
            <span className="hidden lg:inline">Customize Columns</span>
            <span className="lg:hidden">Columns</span>
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide(),
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === "orderNumber"
                      ? "Order Number"
                      : column.id === "businessUnit"
                        ? "Business Unit"
                        : column.id === "orderType"
                          ? "Order Type"
                          : column.id === "orderDate"
                            ? "Order Date"
                            : column.id === "receiptDate"
                              ? "Receipt Date"
                              : column.id === "vendorName"
                                ? "Vendor Name"
                                : column.id === "vendorRef"
                                  ? "Vendor Ref"
                                  : column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
    </div>
  );
}
