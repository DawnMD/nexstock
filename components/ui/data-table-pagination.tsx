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
 * next/previous affordances come from the server's `pagination` payload while the
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
    // Two stacked rows on a handheld, one on the desktop. Everything below used
    // to be `hidden … lg:flex` except previous/next, so an operator on a scanner
    // could page through a table without ever being told how big it was.
    <div className="flex flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      <div className="text-muted-foreground flex flex-1 items-center justify-between gap-4 text-sm">
        <span>
          <span className="lg:hidden">
            {firstRow}–{lastRow} of {totalCount}
          </span>
          <span className="hidden lg:inline">
            Showing {firstRow} to {lastRow} of {totalCount} row(s).
          </span>
        </span>
        <span className="font-medium lg:hidden">
          Page {pageIndex + 1} of {pageCount}
        </span>
      </div>
      <div className="flex w-full items-center justify-between gap-4 lg:w-fit lg:justify-end lg:gap-8">
        <div className="flex items-center gap-2">
          {/* The text is dropped rather than the control on a narrow screen —
              picking 10 rows instead of 50 is worth more on a handheld than on
              a desktop, not less. */}
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            <span className="hidden sm:inline">Rows per page</span>
            <span className="sm:hidden">Rows</span>
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-11 w-20 lg:h-9" id="rows-per-page">
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
        <div className="hidden w-fit items-center justify-center text-sm font-medium lg:flex">
          Page {pageIndex + 1} of {pageCount}
        </div>
        {/* 44px targets on touch, back to 32px where there is a mouse. */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            className="size-11 lg:size-8"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!hasPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-11 lg:size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!hasPreviousPage}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            className="size-11 lg:size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!hasNextPage}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            className="size-11 lg:size-8"
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
