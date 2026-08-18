/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see `server/api/context.ts`).
 * 2. You want to create a new middleware or type of procedure (see below).
 *
 * TL;DR - This is where the oRPC procedure builders are created. The pieces you
 * will need to use are exported at the end.
 */
import { ORPCError, os } from "@orpc/server";

import { env } from "@/env";
import type { Context } from "@/server/api/context";
import { ServiceError } from "@/server/services/errors";

/**
 * The base builder. Everything below hangs off it, so the initial context is
 * declared exactly once.
 *
 * @see https://orpc.dev/docs/context
 */
const base = os.$context<Context>();

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = base.middleware(async ({ next, path }) => {
  const isDevelopment = env.NODE_ENV === "development";

  if (!isDevelopment) {
    // Nothing to time and nothing to log, so don't pay for `Date.now()` twice
    // on every call in production.
    return await next();
  }

  const start = Date.now();

  // artificial delay in dev
  const waitMs = Math.floor(Math.random() * 400) + 100;
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const result = await next();

  const end = Date.now();
  // Development only. This used to log on every production request too, which
  // is one line of noise per procedure call in the server logs — including the
  // batched ones, where a single page load is a dozen of them.
  console.log(`[oRPC] ${path.join(".")} took ${end - start}ms to execute`);

  return result;
});

/**
 * Translate service-layer errors into transport errors.
 *
 * The modules under `server/services/` know nothing about the transport — they
 * throw `ServiceError`, and this is the one place that maps it onto the wire.
 * All four `ServiceError` codes are also oRPC error codes, so the translation
 * is one-to-one and the business logic underneath never had to move.
 */
const serviceErrorMiddleware = base.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ServiceError) {
      throw new ORPCError(error.code, {
        message: error.message,
        cause: error,
      });
    }

    throw error;
  }
});

/**
 * Middleware for checking if the user is authenticated
 */
const isAuthenticatedMiddleware = base.middleware(async ({ next, context }) => {
  const id = context.userId;

  if (!id) {
    throw new ORPCError("UNAUTHORIZED");
  }

  // oRPC merges what is passed here into the current context rather than
  // replacing it, so only the narrowed field needs naming.
  return next({ context: { userId: id } });
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new procedures. It does not guarantee
 * that a user calling is authorized, but you can still access user session data
 * if they are logged in.
 */
export const publicProcedure = base
  .use(timingMiddleware)
  .use(serviceErrorMiddleware);

/**
 * Refuse anything that writes when the caller is a demo account.
 *
 * The public demo signs in as a real, verified user so every screen behaves
 * exactly as it does for an operator — the read paths are not special-cased
 * anywhere. Only this middleware differs, and it sits on the server rather than
 * on a disabled button, so hiding the UI is not what is protecting the data.
 *
 * `isDemo` is read from the database rather than the session cookie: sessions
 * are cached for five minutes (see `lib/auth.ts`), and revoking demo status
 * should take effect immediately rather than whenever the cache happens to
 * expire.
 */
const notDemoMiddleware = base.middleware(async ({ next, context }) => {
  if (context.userId) {
    const user = await context.db.user.findUnique({
      where: { id: context.userId },
      select: { isDemo: true },
    });

    if (user?.isDemo) {
      throw new ORPCError("FORBIDDEN", {
        message:
          "This is a read-only demo account — browse anything, but nothing can be changed.",
      });
    }
  }

  // `next()` with no argument, so the `userId: string` narrowing that
  // `isAuthenticatedMiddleware` established survives. Passing the context back
  // here would widen it to `string | null` again and break every
  // `createdBy: ctx.userId` downstream.
  return next();
});

/**
 * Private (authenticated) procedure
 *
 * Everything a signed-in operator can read is built on this.
 */
export const privateProcedure = publicProcedure.use(isAuthenticatedMiddleware);

/**
 * Authenticated procedure that also changes something.
 *
 * Every mutation should be built on this rather than on `privateProcedure`; the
 * only cost over it is one indexed lookup per write.
 */
export const writeProcedure = privateProcedure.use(notDemoMiddleware);
