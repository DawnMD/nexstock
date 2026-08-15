import type { Metadata } from "next";
import { PageMain } from "@/components/page-main";
import { PickList } from "@/components/pick-list";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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

  void api.outbound.getPickList.prefetch({ orderNumber: order });

  return (
    <>
      <SiteHeader title="Pick List" />
      <PageMain className="flex flex-col gap-4 p-4">
        <HydrateClient>
          <PickList orderNumber={order} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
