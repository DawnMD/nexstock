/**
 * Shared between the client `SidebarProvider`, which writes the cookie, and the
 * server layout, which reads it back to seed `defaultOpen`.
 *
 * It lives here rather than in `components/ui/sidebar.tsx` because that module is
 * `"use client"`: a server component importing a value from a client module gets
 * a client-reference proxy instead of the string.
 */
export const SIDEBAR_COOKIE_NAME = "sidebar_state";
