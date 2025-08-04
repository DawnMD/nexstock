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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStatusVariant } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { OrderStatus } from "@prisma/client";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
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
            asChild
          >
            <Link href={`/orders/${row.original.orderNumber}`}>
              <ExternalLinkIcon className="size-4" />
              <span className="sr-only">View order details</span>
            </Link>
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
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

  const table = useReactTable({
    data: data.items ?? [],
    columns,
    state: {
      columnVisibility,
      columnFilters,
      pagination,
    },
    manualPagination: true,
    pageCount: data.pagination.totalPages ?? 0,
    getRowId: (row) => row.id.toString(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    rowCount: data.pagination.totalCount,
  });

  return (
    <div className="flex w-full flex-col justify-start gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchForm query={query} action="/orders" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ColumnsIcon />
              <span className="hidden lg:inline">Customize Columns</span>
              <span className="lg:hidden">Columns</span>
              <ChevronDownIcon />
            </Button>
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
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow className="h-12" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow className="h-12" key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
            {Math.min(
              pagination.pageIndex * pagination.pageSize +
                (data?.items.length ?? 0),
              data?.pagination.totalCount ?? 0,
            )}{" "}
            of {data?.pagination.totalCount ?? 0} row(s).
          </div>
          <div className="flex w-full items-center gap-8 py-2 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!data.pagination.hasPreviousPage}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!data.pagination.hasPreviousPage}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!data.pagination.hasNextPage}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!data.pagination.hasNextPage}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
