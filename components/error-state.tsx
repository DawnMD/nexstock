"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangleIcon, HomeIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Shared failure screen for the route error boundaries.
 *
 * A dropped Wi-Fi connection on a handheld is the likeliest failure in a
 * warehouse, and it surfaces as a thrown tRPC error inside a suspense query.
 * Retry has to be one large tap away, so `reset` is the primary action.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  reset,
}: {
  title?: string;
  description?: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="bg-destructive/10 mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
            <AlertTriangleIcon className="text-destructive h-5 w-5" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ??
              "The page could not be loaded. This is usually a dropped connection — try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground bg-muted rounded-md p-3 font-mono text-xs break-words">
            {error.message || "Unknown error"}
            {error.digest ? ` (${error.digest})` : ""}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} className="h-11 flex-1">
              <RotateCcwIcon className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              <HomeIcon className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
