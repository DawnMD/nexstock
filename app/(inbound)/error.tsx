"use client";

import { ErrorState } from "@/components/error-state";
import { PageMain } from "@/components/page-main";
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
      <PageMain className="flex flex-1 flex-col">
        <ErrorState error={error} reset={reset} />
      </PageMain>
    </>
  );
}
