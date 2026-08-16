import { onError, ORPCError, ValidationError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { z } from "zod";

import { env } from "@/env";
import { createContext } from "@/server/api/context";
import { router } from "@/server/api/root";

/**
 * The HTTP transport for client components.
 *
 * `BatchHandlerPlugin` is not optional here: it is the server half of
 * `BatchLinkPlugin` in `orpc/client.tsx`, and it is what keeps a screen like
 * `/inventory` — six queries fired at once — to a single round trip instead of
 * six. Without it every invalidation fans out.
 */
const handler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
  clientInterceptors: [
    /**
     * Turn a schema failure into something an operator can read.
     *
     * oRPC reports a failed `.input()` as a `BAD_REQUEST` whose `cause` is a
     * `ValidationError`, and its default message is generic. Every mutation's
     * `onError` toasts `error.message`, so that message is the whole of what
     * the operator sees — prettifying the zod issues into it is the difference
     * between "Input validation failed" and "quantity: expected a positive
     * number".
     */
    onError((error) => {
      if (
        error instanceof ORPCError &&
        error.code === "BAD_REQUEST" &&
        error.cause instanceof ValidationError
      ) {
        const zodError = new z.ZodError(
          error.cause.issues as z.core.$ZodIssue[],
        );

        throw new ORPCError("INPUT_VALIDATION_FAILED", {
          status: 422,
          message: z.prettifyError(zodError),
          cause: error.cause,
        });
      }
    }),
    onError((error, { path }) => {
      if (env.NODE_ENV !== "development") return;

      console.error(
        `❌ oRPC failed on ${path.join(".") || "<no-path>"}:`,
        error instanceof Error ? error.message : error,
      );
    }),
  ],
});

async function handle(request: Request) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await createContext(request.headers),
  });

  return response ?? new Response("Not found", { status: 404 });
}

export { handle as GET, handle as POST };
