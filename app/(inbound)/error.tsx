"use client";

import { ErrorState } from "@/components/error-state";
import { SiteHeader } from "@/components/site-header";

export default function InboundError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader title="Something went wrong" />
      <main className="flex flex-1 flex-col">
        <ErrorState error={error} reset={reset} />
      </main>
    </>
  );
}
