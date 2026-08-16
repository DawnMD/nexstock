/**
 * Transport-agnostic errors for the service layer.
 *
 * The services under `server/services/` deliberately don't import from the
 * transport: they take a Prisma transaction client and throw these, and one
 * middleware translates them into `ORPCError`s (see `serviceErrorMiddleware` in
 * `server/api/orpc.ts`). That is what let the move from tRPC to oRPC leave the
 * business logic untouched — only the router shell changed, and all four codes
 * below happen to be oRPC error codes as well.
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

/**
 * The record exists and the write is well-formed, but the state it is in does
 * not allow this step yet — a vehicle cannot be closed before it was opened.
 * Distinct from `badRequest`: the same call becomes valid once the missing
 * predecessor happens.
 */
export const preconditionFailed = (message: string) =>
  new ServiceError("PRECONDITION_FAILED", message);
