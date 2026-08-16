import { auth } from "@/lib/auth";
import { db } from "@/server/db";

/**
 * The context every procedure runs with.
 *
 * Built once per request and shared by the three entry points: the HTTP handler
 * at `/api/rpc`, the RSC router client in `orpc/server.ts`, and the CSV export
 * route. Keeping it here rather than next to any one of them is what stops the
 * three drifting apart.
 */
export type Context = {
  db: typeof db;
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  /**
   * Kept as `string | null` deliberately: `isAuthenticatedMiddleware` narrows it
   * to `string`, and that narrowing is what lets every router write
   * `createdBy: ctx.userId` without a null check.
   */
  userId: string | null;
  headers: Headers;
};

export const createContext = async (headers: Headers): Promise<Context> => {
  const session = await auth.api.getSession({ headers });

  return {
    db,
    session,
    userId: session?.user.id ?? null,
    headers,
  };
};
