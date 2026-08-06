import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

/**
 * Resolve the current session. `cache` dedupes the lookup across a single render
 * pass, so a layout and the page under it share one call.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

/**
 * Clerk's `auth.protect()` redirected on a missing session; this is the direct
 * replacement. `redirect()` throws, so call it before any try/catch.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
