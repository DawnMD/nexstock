/**
 * Where Better Auth sends the browser after it has consumed a verification
 * token. Success lands here with a session cookie already set; failure lands
 * here as `?error=<CODE>`. Shared so the sign-up, sign-in and verify screens
 * cannot drift apart — a mismatch only shows up after a real email round-trip.
 *
 * Deliberately free of `server-only`: client components build the sign-up and
 * resend calls with it.
 */
export const VERIFY_EMAIL_CALLBACK_URL = "/verify-email";
