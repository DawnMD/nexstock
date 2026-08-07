import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to NexStock.",
};

export default async function SignInPage() {
  if (await getSession()) redirect("/dashboard");

  return <SignInForm />;
}
