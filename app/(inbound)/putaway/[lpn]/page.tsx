import { api, HydrateClient } from "@/trpc/server";
import { SiteHeader } from "@/components/site-header";
import { PutawayProcess } from "@/components/putaway-process";
import { notFound } from "next/navigation";

interface PutawayLPNPageProps {
  params: {
    lpn: string;
  };
}

export default async function PutawayLPNPage({ params }: PutawayLPNPageProps) {
  try {
    await api.putaway.getLPNDetails.prefetch({ lpn: params.lpn });
    await api.putaway.getLocations.prefetch();
  } catch (error) {
    notFound();
  }

  return (
    <>
      <SiteHeader title={`Putaway - ${params.lpn}`} />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <HydrateClient>
          <PutawayProcess lpn={params.lpn} />
        </HydrateClient>
      </main>
    </>
  );
}
