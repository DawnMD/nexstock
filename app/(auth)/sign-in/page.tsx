import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { getSession } from "@/lib/session";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to NexStock.",
};

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <SignInForm
      allowSignUp={env.ALLOW_SIGN_UP}
      demoCredentials={
        env.DEMO_MODE === "off"
          ? undefined
          : {
              email: env.DEMO_ACCOUNT_EMAIL,
              password: env.DEMO_ACCOUNT_PASSWORD,
              writable: env.DEMO_MODE === "shared-writable",
            }
      }
    />
  );
}
