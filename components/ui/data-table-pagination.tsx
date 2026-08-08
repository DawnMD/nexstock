"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppTableFeatures } from "@/lib/table-features";
import type { ReactTable, RowData } from "@tanstack/react-table";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

/**
 * Footer shared by every table built on `tableFeatureSet`.
 *
 * Both tables paginate on the server, so the row counts and the
 * next/previous affordances come from the tRPC `pagination` payload while the
 * page index and size are read off the table's own state. Reading them from
 * `table.state` rather than from a caller-local variable is what keeps the
 * displayed range in step with the buttons.
 */
export function DataTablePagination<TData extends RowData>({
  table,
  totalCount,
  pageRowCount,
  hasNextPage,
  hasPreviousPage,
}: {
  table: ReactTable<AppTableFeatures, TData>;
  totalCount: number;
  pageRowCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}) {
  const { pageIndex, pageSize } = table.state.pagination;
  // An empty result has no first row, and `getPageCount()` is 0 for it. Both
  // need flooring, or a search with no hits reads "Showing 1 to 0" on
  // "Page 1 of 0".
  const firstRow = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min(pageIndex * pageSize + pageRowCount, totalCount);
  const pageCount = Math.max(table.getPageCount(), 1);

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        Showing {firstRow} to {lastRow} of {totalCount} row(s).
      </div>
      <div className="flex w-full items-center gap-8 py-2 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!hasPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!hasPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!hasNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!hasNextPage}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
