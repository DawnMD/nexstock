/**
 * Transport-agnostic errors for the service layer.
 *
 * The services under `server/services/` deliberately don't import from tRPC:
 * they take a Prisma transaction client and throw these, and the router layer
 * translates them into `TRPCError`s (see `toTRPCError` in `server/api/trpc.ts`).
 * That is what lets the business logic move to oRPC in Phase 5 untouched, with
 * only the router shell changing.
 */

export type ServiceErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRECONDITION_FAILED";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
  }
}

/** The caller asked for something impossible given the current state. */
export const badRequest = (message: string) =>
  new ServiceError("BAD_REQUEST", message);

/** The record the caller named does not exist. */
export const notFound = (message: string) =>
  new ServiceError("NOT_FOUND", message);

/** The write collides with one that already happened. */
export const conflict = (message: string) =>
  new ServiceError("CONFLICT", message);
