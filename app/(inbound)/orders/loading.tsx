import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export default function OrdersLoading() {
  return (
    <>
      <SiteHeader title="Orders" />
      <PageMain className="flex w-full flex-col justify-start gap-6 p-4">
        {/* Header with customize columns button */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex items-center gap-2">
            <Input
              id="search"
              placeholder="Type to search..."
              className="h-8 pl-7"
              disabled
            />
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
            <Button variant="outline" className="h-8" disabled>
              Search
            </Button>
          </div>
          <Skeleton className="h-9 w-full lg:w-32" />
        </div>

        <div className="relative flex flex-col gap-4 overflow-auto">
          {/* Table skeleton */}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow className="h-12">
                  <TableHead>
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-18" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-16" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-22" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-18" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 20 }).map((_, index) => (
                  <TableRow className="h-12" key={index}>
                    {/* Order Number with icon */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-6 rounded" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="size-6 rounded" />
                      </div>
                    </TableCell>
                    {/* Business Unit */}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {/* Order Type */}
                    <TableCell>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </TableCell>
                    {/* Status */}
                    <TableCell>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </TableCell>
                    {/* Order Date */}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {/* Receipt Date */}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    {/* Vendor Name */}
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    {/* Vendor Ref */}
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between px-4">
            <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex w-full items-center gap-8 lg:w-fit">
              <div className="hidden items-center gap-2 lg:flex">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
              <Skeleton className="h-4 w-24" />
              <div className="ml-auto flex items-center gap-2 lg:ml-0">
                <Skeleton className="hidden h-8 w-8 lg:flex" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="hidden h-8 w-8 lg:flex" />
              </div>
            </div>
          </div>
        </div>
      </PageMain>
    </>
  );
}
