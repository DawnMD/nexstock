import type { Metadata } from "next";
import { Suspense } from "react";
import { WorklistSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { PackAndShip } from "@/components/pack-and-ship";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pack & Ship",
  description: "Box picked stock into cartons and dispatch them.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | null }>;
}) {
  await requireSession();

  const { order } = await searchParams;

  // Packing and shipping are both scoped to one order — a carton cannot mix
  // orders, and a shipment belongs to exactly one. Without one named there is
  // nothing to show.
  if (!order) {
    return (
      <>
        <SiteHeader title="Pack & Ship" />
        <PageMain className="p-4">
          <Card>
            <CardContent className="text-muted-foreground py-12 text-center text-sm">
              Choose a sales order to pack and ship from the{" "}
              <Link href="/sales-orders" className="underline">
                sales orders
              </Link>{" "}
              list.
            </CardContent>
          </Card>
        </PageMain>
      </>
    );
  }

  prefetch(
    serverOrpc.outbound.getPackList.queryOptions({
      input: { orderNumber: order },
    }),
  );
  prefetch(
    serverOrpc.outbound.getUnshippedCartons.queryOptions({
      input: { orderNumber: order },
    }),
  );

  return (
    <>
      <SiteHeader title="Pack & Ship" />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<WorklistSkeleton />}>
            <PackAndShip orderNumber={order} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
