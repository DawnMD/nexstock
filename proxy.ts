import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk no longer recommends gating routes from the proxy. Every server-side resource protects
// itself instead: pages and layouts call `auth.protect()`, tRPC uses `privateProcedure`.
// See https://clerk.com/docs/guides/development/upgrading/upgrade-guides/migrate-from-create-route-matcher
// clerkMiddleware() itself stays — Clerk needs it to attach auth to the request.
export const proxy = clerkMiddleware();

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
