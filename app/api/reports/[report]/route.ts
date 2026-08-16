import { type NextRequest } from "next/server";

import { csvResponse, toCsv } from "@/lib/csv";
import { getSession } from "@/lib/session";
import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * CSV export for the reports screen.
 *
 * A route handler rather than a tRPC procedure because the browser has to be
 * handed a file: tRPC speaks JSON over a batched transport, so a download needs
 * a plain endpoint with `Content-Disposition` on it.
 *
 * The data still comes from the same tRPC procedures the screen renders, through
 * a server-side caller. That is deliberate — the report and its export cannot
 * drift apart, because there is only one query behind both.
 */

type Report =
  | "receiving"
  | "shipping"
  | "quality"
  | "dock-turnaround"
  | "aging"
  | "utilisation";

const REPORTS = new Set<Report>([
  "receiving",
  "shipping",
  "quality",
  "dock-turnaround",
  "aging",
  "utilisation",
]);

const isReport = (value: string): value is Report =>
  REPORTS.has(value as Report);

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ report: string }> },
) {
  // Reports are warehouse data; the same session guard the screens use applies.
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { report } = await params;
  if (!isReport(report)) {
    return new Response(`Unknown report "${report}"`, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const range = {
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
  };

  const api = createCaller(() =>
    createTRPCContext({ headers: request.headers }),
  );

  const { body, filename } = await buildReport(api, report, range);
  return csvResponse(filename, body);
}

type Caller = ReturnType<typeof createCaller>;

async function buildReport(
  api: Caller,
  report: Report,
  range: { from?: Date; to?: Date },
): Promise<{ body: string; filename: string }> {
  const stamp = new Date().toISOString().slice(0, 10);

  switch (report) {
    case "receiving": {
      const rows = await api.reports.getReceivingThroughput(range);
      return {
        filename: `receiving-throughput-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "Day", value: (r) => r.day },
          { header: "Receipts", value: (r) => r.receipts },
          { header: "Units", value: (r) => r.units },
        ]),
      };
    }

    case "shipping": {
      const rows = await api.reports.getShippingThroughput(range);
      return {
        filename: `shipping-throughput-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "Day", value: (r) => r.day },
          { header: "Shipments", value: (r) => r.shipments },
          { header: "Units", value: (r) => r.units },
        ]),
      };
    }

    case "quality": {
      const rows = await api.reports.getQualityBySku(range);
      return {
        filename: `quality-by-sku-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "SKU", value: (r) => r.sku },
          { header: "Description", value: (r) => r.description },
          { header: "Received", value: (r) => r.received },
          { header: "Rejected", value: (r) => r.rejected },
          { header: "Reject rate %", value: (r) => r.rejectRate },
          { header: "Inspections", value: (r) => r.inspections },
        ]),
      };
    }

    case "dock-turnaround": {
      const rows = await api.reports.getDockTurnaround(range);
      return {
        filename: `dock-turnaround-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "Vehicle", value: (r) => r.vehicleNumber },
          { header: "Order", value: (r) => r.orderId },
          { header: "Dock", value: (r) => r.dockName },
          { header: "Checked in", value: (r) => r.checkIn },
          { header: "Checked out", value: (r) => r.checkOut },
          { header: "Minutes on dock", value: (r) => r.minutesOnDock },
        ]),
      };
    }

    case "aging": {
      const rows = await api.reports.getStockAging();
      return {
        filename: `stock-aging-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "Age bucket", value: (r) => r.bucket },
          { header: "Units", value: (r) => r.units },
          { header: "Pallets", value: (r) => r.pallets },
        ]),
      };
    }

    case "utilisation": {
      const rows = await api.reports.getLocationUtilisation();
      return {
        filename: `location-utilisation-${stamp}.csv`,
        body: toCsv(rows, [
          { header: "Location", value: (r) => r.location },
          { header: "Zone", value: (r) => r.zone },
          { header: "Units", value: (r) => r.units },
          { header: "Used cbm", value: (r) => r.usedCbm },
          { header: "Rated cbm", value: (r) => r.ratedCbm },
          { header: "Utilisation %", value: (r) => r.utilisation },
        ]),
      };
    }
  }
}
