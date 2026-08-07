import type { Metadata } from "next";
import { api, HydrateClient } from "@/trpc/server";
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

  await Promise.all([
    api.putaway.getLPNDetails.prefetch({ lpn }),
    api.putaway.getLocations.prefetch(),
  ]);

  return (
    <>
      <SiteHeader title={`Putaway - ${lpn}`} />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <HydrateClient>
          <PutawayProcess lpn={lpn} />
        </HydrateClient>
      </main>
    </>
  );
}
