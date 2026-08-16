import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { PickList } from "@/components/pick-list";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Pick List",
  description: "Allocated stock waiting to be picked, in aisle order.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | null }>;
}) {
  await requireSession();

  const { order } = await searchParams;

  prefetch(
    serverOrpc.outbound.getPickList.queryOptions({
      input: { orderNumber: order },
    }),
  );

  return (
    <>
      <SiteHeader title="Pick List" />
      <PageMain className="flex flex-col gap-4 p-4">
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={8} rows={8} />}>
            <PickList orderNumber={order} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
