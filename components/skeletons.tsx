import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * The loading shapes shared by the route-level `loading.tsx` files and the
 * per-component `<Suspense>` boundaries inside the pages.
 *
 * They live together so the two cannot drift: a route falling back to
 * `loading.tsx` on a hard navigation and the same route streaming a single
 * section in should not look like different screens.
 */

const range = (length: number) => Array.from({ length });

/** The row of headline numbers at the top of a screen. */
export function StatCardsSkeleton({
  count = 4,
  withIcon = false,
  className,
}: {
  count?: number;
  withIcon?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}
      aria-hidden
    >
      {range(count).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex items-center gap-4 p-4">
            {withIcon && <Skeleton className="size-9 rounded-md" />}
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** A bare table body, for use where the surrounding border already exists. */
export function TableSkeleton({
  columns,
  rows = 10,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <Table aria-hidden>
      <TableHeader>
        <TableRow>
          {range(columns).map((_, index) => (
            <TableHead key={index}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {range(rows).map((_, row) => (
          <TableRow key={row}>
            {range(columns).map((_, cell) => (
              <TableCell key={cell}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** A table on its own card surface. */
export function CardTableSkeleton({
  columns,
  rows = 10,
  className,
}: {
  columns: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-card rounded-lg border", className)}>
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

/** A server-paginated table: the grid plus the footer controls under it. */
export function DataTableSkeleton({
  columns,
  rows = 20,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div className="relative flex flex-col gap-4 overflow-auto" aria-hidden>
      <div className="overflow-hidden rounded-lg border">
        <TableSkeleton columns={columns} rows={rows} />
      </div>

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
  );
}

/** Tab strip plus the panel under it, for the tabbed screens. */
export function TabbedTableSkeleton({
  tabs = 4,
  columns,
  rows = 8,
}: {
  tabs?: number;
  columns: number;
  rows?: number;
}) {
  return (
    <div className="w-full" aria-hidden>
      <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
        {range(tabs).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24" />
        ))}
      </div>
      <CardTableSkeleton className="mt-4" columns={columns} rows={rows} />
    </div>
  );
}

/** The card and list screens — search results, worklists, order pickers. */
export function CardListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-hidden>
      {range(rows).map((_, index) => (
        <Card key={index}>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** A Recharts panel. */
export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-64 w-full", className)} aria-hidden />;
}

/** The read-only "Order Details" grids that head the process screens. */
export function DetailFieldsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {range(count).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </div>
  );
}

/** `<OrderDetail>`: header cards, a tab strip, then the line items table. */
export function OrderDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-6" aria-hidden>
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {range(3).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <CardTableSkeleton columns={7} rows={5} />
    </div>
  );
}

/** `<SalesOrderDetail>`: the status tiles, then lines and pick tasks. */
export function SalesOrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <StatCardsSkeleton count={4} />
      <CardTableSkeleton columns={8} rows={5} />
    </div>
  );
}

/** `<ReportsView>`: the headline tiles above the tabbed charts. */
export function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6" aria-hidden>
      <StatCardsSkeleton count={4} />
      <div className="bg-muted inline-flex gap-1 rounded-lg p-1">
        {range(4).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24" />
        ))}
      </div>
      <ChartSkeleton />
    </div>
  );
}

/** A stack of cards, for the process screens that are mostly form. */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {range(fields).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

/** A checkbox list with a form under it — the pack and pick worklists. */
export function WorklistSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="divide-y rounded-lg border">
        {range(rows).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {range(3).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
