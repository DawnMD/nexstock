import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SignUpForm } from "@/components/sign-up-form";
import { getSession } from "@/lib/session";
import { env } from "@/env";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a NexStock account.",
};

export default async function SignUpPage() {
  if (!env.ALLOW_SIGN_UP) notFound();
  if (await getSession()) redirect("/dashboard");

  return <SignUpForm />;
}
