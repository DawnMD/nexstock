import { api, HydrateClient } from "@/trpc/server";
import { SiteHeader } from "@/components/site-header";
import { PutawayProcess } from "@/components/putaway-process";
import { auth } from "@clerk/nextjs/server";

export default async function PutawayLPNPage({
  params,
}: {
  params: Promise<{ lpn: string }>;
}) {
  await auth.protect();

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
