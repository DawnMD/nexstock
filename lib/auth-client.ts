import { createAuthClient } from "better-auth/react";

// No `baseURL` — the client defaults to the same-origin `/api/auth` handler.
export const authClient = createAuthClient();
