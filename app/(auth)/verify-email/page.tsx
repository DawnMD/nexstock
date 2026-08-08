import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResendVerificationForm } from "@/components/resend-verification-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your NexStock email address.",
};

// Better Auth appends `?error=<BASE_ERROR_CODES key>` when it cannot consume the
// token. Anything not listed falls back to the generic copy.
const ERROR_COPY: Record<string, string> = {
  TOKEN_EXPIRED: "That link has expired.",
  INVALID_TOKEN: "That link is not valid.",
  USER_NOT_FOUND: "That link is not valid.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // No error means the token was consumed. `autoSignInAfterVerification` has
  // already set the cookie, so the only thing left is to get out of the way.
  if (!error) {
    if (await getSession()) redirect("/dashboard");

    // Reached by clicking a link for an address that was already verified —
    // nothing to do but sign in.
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email verified</CardTitle>
          <CardDescription>
            Your address is confirmed. Sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center text-sm">
            <Link className="underline underline-offset-4" href="/sign-in">
              Go to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification failed</CardTitle>
        <CardDescription>
          {ERROR_COPY[error] ?? "We could not verify that link."} Enter your
          email and we&apos;ll send a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResendVerificationForm />

        <p className="text-muted-foreground text-center text-sm">
          <Link className="underline underline-offset-4" href="/sign-in">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
