"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";
import { Suspense } from "react";
import { format } from "date-fns";
import { DownloadIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Palette, by role rather than raw hex.
 *
 * Inbound is the blue slot and outbound the orange one — colour follows the
 * direction stock is moving, which is a real distinction in this app, not the
 * chart's position on the page. Both are the validated categorical slots 1 and 2.
 *
 * The aging ramp is ordinal, not categorical: the buckets are ordered, so the
 * encoding is one hue getting darker as stock gets older. Its light end is held
 * above the surface (2.06:1) so "newest" is still a visible mark rather than
 * something that fades into the card.
 */
const SERIES_INBOUND = "var(--viz-inbound)";
const SERIES_OUTBOUND = "var(--viz-outbound)";
const AGING_RAMP = [
  "var(--viz-ordinal-1)",
  "var(--viz-ordinal-2)",
  "var(--viz-ordinal-3)",
  "var(--viz-ordinal-4)",
];

const AXIS = "var(--viz-axis)";
const GRID = "var(--viz-grid)";

function ExportLink({ report, label }: { report: string; label: string }) {
  return (
    <a
      href={`/api/reports/${report}`}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      // A route handler, not a tRPC call: the browser has to be handed a file.
      download
    >
      <DownloadIcon className="size-3" />
      {label}
    </a>
  );
}

/**
 * Each tab's content is only mounted when the tab is selected, and its queries
 * are `useSuspenseQuery`, so it needs its own boundary — the page-level prefetch
 * only covers what the first tab shows. Without this the panel suspends with
 * nothing above it to catch it and renders as blank.
 */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
      {message}
    </div>
  );
}

/** Recharts' default tooltip inherits none of the app's surface tokens. */
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
};

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
    </Card>
  );
}

function ThroughputCharts() {
  const [receiving] = api.reports.getReceivingThroughput.useSuspenseQuery({});
  const [shipping] = api.reports.getShippingThroughput.useSuspenseQuery({});

  const shape = (rows: { day: Date; units: number }[]) =>
    rows.map((row) => ({
      day: format(row.day, "dd MMM"),
      units: row.units,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Units received per day</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </div>
          <ExportLink report="receiving" label="CSV" />
        </CardHeader>
        <CardContent>
          {receiving.length === 0 ? (
            <Empty message="Nothing received in this period." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={shape(receiving)}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: GRID }}
                />
                {/* One series, so the title names it and no legend is needed. */}
                <Line
                  type="monotone"
                  dataKey="units"
                  name="Units"
                  stroke={SERIES_INBOUND}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: SERIES_INBOUND }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Units shipped per day</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </div>
          <ExportLink report="shipping" label="CSV" />
        </CardHeader>
        <CardContent>
          {shipping.length === 0 ? (
            <Empty message="Nothing shipped in this period." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={shape(shipping)}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ stroke: GRID }}
                />
                <Line
                  type="monotone"
                  dataKey="units"
                  name="Units"
                  stroke={SERIES_OUTBOUND}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: SERIES_OUTBOUND }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgingChart() {
  const [aging] = api.reports.getStockAging.useSuspenseQuery();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Stock aging</CardTitle>
          <CardDescription>
            Measured from the receipt that brought each pallet in, so relocating
            a pallet does not make it look new again.
          </CardDescription>
        </div>
        <ExportLink report="aging" label="CSV" />
      </CardHeader>
      <CardContent>
        {aging.length === 0 ? (
          <Empty message="No stock on hand." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={aging}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="bucket"
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  stroke={AXIS}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "transparent" }}
                />
                {/* Ordered buckets, so the ramp darkens with age rather than
                    handing each bucket an unrelated hue. */}
                <Bar dataKey="units" name="Units" radius={[4, 4, 0, 0]}>
                  {aging.map((row, index) => (
                    <Cell
                      key={row.bucket}
                      fill={AGING_RAMP[index] ?? AGING_RAMP[3]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* The table view the accessibility pass requires: the same numbers
                without relying on the chart. */}
            <div className="mt-4 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Pallets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aging.map((row) => (
                    <TableRow key={row.bucket}>
                      <TableCell>{row.bucket}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.units.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.pallets.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function QualityTable() {
  const [rows] = api.reports.getQualityBySku.useSuspenseQuery({});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Reject rate by SKU</CardTitle>
          <CardDescription>
            Rejected over received across every line, so a SKU that consistently
            arrives damaged stands out from one bad pallet.
          </CardDescription>
        </div>
        <ExportLink report="quality" label="CSV" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty message="Nothing received in this period." />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Reject rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.sku}>
                    <TableCell className="font-mono">{row.sku}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.received.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.rejected.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.rejectRate.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DockTurnaroundTable() {
  const [rows] = api.reports.getDockTurnaround.useSuspenseQuery({});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Dock turnaround</CardTitle>
          <CardDescription>
            Check-in to check-out. Only vehicles that completed the lifecycle
            are counted — one still on the dock has no turnaround time yet.
          </CardDescription>
        </div>
        <ExportLink report="dock-turnaround" label="CSV" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty message="No vehicle has completed check-in through check-out in this period." />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Dock</TableHead>
                  <TableHead className="hidden lg:table-cell">Order</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Checked in
                  </TableHead>
                  <TableHead className="text-right">Minutes on dock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.vehicleNumber}-${row.orderId}`}>
                    <TableCell className="font-mono">
                      {row.vehicleNumber}
                    </TableCell>
                    <TableCell>{row.dockName}</TableCell>
                    <TableCell className="hidden font-mono lg:table-cell">
                      {row.orderId}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(row.checkIn, "dd MMM HH:mm")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.minutesOnDock.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UtilisationTable() {
  const [rows] = api.reports.getLocationUtilisation.useSuspenseQuery();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Location utilisation</CardTitle>
          <CardDescription>
            Volume used against the rack&apos;s rating. An unrated rack reports
            nothing rather than 0% — &ldquo;unrated&rdquo; and
            &ldquo;empty&rdquo; are different answers.
          </CardDescription>
        </div>
        <ExportLink report="utilisation" label="CSV" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty message="No active locations." />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Used cbm</TableHead>
                  <TableHead className="text-right">Rated cbm</TableHead>
                  <TableHead className="text-right">Utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.location}>
                    <TableCell className="font-mono">{row.location}</TableCell>
                    <TableCell>{row.zone}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.units.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.usedCbm == null ? "—" : row.usedCbm.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.ratedCbm == null ? "—" : row.ratedCbm.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.utilisation == null
                        ? "unrated"
                        : `${row.utilisation.toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsView() {
  const [summary] = api.reports.getSummary.useSuspenseQuery({});

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Units received"
          value={summary.unitsReceived}
          hint={`${summary.receipts} receipts, last 30 days`}
        />
        <StatTile
          label="Units rejected"
          value={summary.unitsRejected}
          hint="written off at quality check"
        />
        <StatTile
          label="Shipments"
          value={summary.shipments}
          hint="dispatched in the period"
        />
        <StatTile
          label="Units on hand"
          value={summary.unitsOnHand}
          hint="across every location now"
        />
      </div>

      <Tabs defaultValue="throughput">
        <TabsList>
          <TabsTrigger value="throughput">Throughput</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="docks">Docks</TabsTrigger>
        </TabsList>

        <TabsContent value="throughput" className="mt-4">
          <Panel>
            <ThroughputCharts />
          </Panel>
        </TabsContent>
        <TabsContent value="inventory" className="mt-4 flex flex-col gap-4">
          <Panel>
            <AgingChart />
          </Panel>
          <Panel>
            <UtilisationTable />
          </Panel>
        </TabsContent>
        <TabsContent value="quality" className="mt-4">
          <Panel>
            <QualityTable />
          </Panel>
        </TabsContent>
        <TabsContent value="docks" className="mt-4">
          <Panel>
            <DockTurnaroundTable />
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
