"use client";

import { ErrorState } from "@/components/error-state";
import { SiteHeader } from "@/components/site-header";

export default function ScanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader title="Could not load this line" />
      <main className="flex flex-1 flex-col">
        <ErrorState
          title="Could not load this line"
          description="The order line could not be loaded. Retry, or go back and scan the order again."
          error={error}
          reset={reset}
        />
      </main>
    </>
  );
}
