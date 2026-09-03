import {
  ArrowRightIcon,
  BoxesIcon,
  PackageCheckIcon,
  TruckIcon,
} from "lucide-react";
import Link from "next/link";

const scenarios = [
  {
    title: "Inspect inventory integrity",
    href: "/inventory",
    route: "/inventory",
    action: "Compare balances, movement history, and reconciliation drift.",
    proof:
      "Shows an append-only stock ledger kept in sync with materialised balances.",
    icon: BoxesIcon,
    accent: "var(--foreground)",
  },
  {
    title: "Complete an inbound task",
    href: "/putaway/LPN000002",
    route: "LPN000002 · staging → rack",
    action: "Choose a storage location and put the waiting pallet away.",
    proof: "Shows capacity checks and an atomic, paired inventory movement.",
    icon: PackageCheckIcon,
    accent: "var(--viz-inbound)",
  },
  {
    title: "Run an outbound workflow",
    href: "/sales-orders/SO-00001",
    route: "SO-00001 · allocate → pick → ship",
    action:
      "Allocate the unreserved order, then follow its generated pick work.",
    proof:
      "Shows FEFO/FIFO reservation, warehouse movement, packing, and dispatch.",
    icon: TruckIcon,
    accent: "var(--viz-outbound)",
  },
] as const;

export function DemoGuide() {
  return (
    <section aria-labelledby="demo-guide-title" className="mb-6 space-y-3">
      <div>
        <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          Recruiter walkthrough
        </p>
        <h2 id="demo-guide-title" className="text-lg font-semibold">
          Three ways to test the warehouse
        </h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {scenarios.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <Link
              className="group focus-visible:ring-ring bg-card hover:bg-accent/40 relative flex min-h-56 flex-col overflow-hidden rounded-xl border border-l-4 p-5 shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              href={scenario.href}
              key={scenario.href}
              style={{ borderLeftColor: scenario.accent }}
            >
              <div className="flex items-start justify-between gap-4">
                <Icon aria-hidden="true" className="size-5" />
                <ArrowRightIcon
                  aria-hidden="true"
                  className="text-muted-foreground size-4 transition-transform group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-6 font-semibold">{scenario.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {scenario.action}
              </p>
              <p className="text-muted-foreground mt-4 border-t pt-3 text-xs leading-relaxed">
                {scenario.proof}
              </p>
              <code className="bg-muted mt-auto block rounded-md px-2.5 py-2 text-xs">
                {scenario.route}
              </code>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
