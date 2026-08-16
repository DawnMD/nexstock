import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { PutawayProcess } from "@/components/putaway-process";
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lpn: string }>;
}): Promise<Metadata> {
  const { lpn } = await params;
  return {
    title: `Putaway ${lpn}`,
    description: `Put the stock on ${lpn} away into a storage location.`,
  };
}

export default async function PutawayLPNPage({
  params,
}: {
  params: Promise<{ lpn: string }>;
}) {
  await requireSession();

  const { lpn } = await params;

  // Not awaited, like every other page: pending queries are dehydrated too, so
  // these stream into the boundary below rather than blocking the RSC render.
  prefetch(serverOrpc.putaway.getLPNDetails.queryOptions({ input: { lpn } }));
  prefetch(serverOrpc.putaway.getLocations.queryOptions());

  return (
    <>
      <SiteHeader title={`Putaway - ${lpn}`} />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
        <HydrateClient>
          <Suspense fallback={<FormSkeleton />}>
            <PutawayProcess lpn={lpn} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
