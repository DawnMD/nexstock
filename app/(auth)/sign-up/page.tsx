import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/sign-up-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a NexStock account.",
};

export default async function SignUpPage() {
  if (await getSession()) redirect("/dashboard");

  return <SignUpForm />;
}
