"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { VERIFY_EMAIL_CALLBACK_URL } from "@/lib/auth-routes";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email(),
    // Matches `emailAndPassword.minPasswordLength` in `lib/auth.ts`; the server
    // rejects anything shorter regardless.
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export function SignUpForm() {
  // Set once the sign-up succeeds. Better Auth returns the same success for an
  // email that already has an account, so this screen deliberately says nothing
  // about whether the address was new.
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: VERIFY_EMAIL_CALLBACK_URL,
    });

    if (error) {
      toast.error(error.message ?? "Could not create your account");
      return;
    }

    setSubmittedEmail(values.email);
  };

  if (submittedEmail) {
    return <CheckYourInbox email={submittedEmail} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              We&apos;ll email you a link to confirm your address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="name">Name</FormLabel>
                  <FormControl>
                    <Input
                      id="name"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>At least 8 characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="confirmPassword">
                    Confirm password
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              className="w-full"
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting
                ? "Creating account..."
                : "Create account"}
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <Link className="underline underline-offset-4" href="/sign-in">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

function CheckYourInbox({ email }: { email: string }) {
  const [resending, setResending] = useState(false);

  const resend = async () => {
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: VERIFY_EMAIL_CALLBACK_URL,
    });
    setResending(false);

    if (error) {
      toast.error(error.message ?? "Could not resend the email");
      return;
    }

    toast.success("Verification email sent");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your inbox</CardTitle>
        <CardDescription>
          If {email} needs an account, a verification link is on its way. The
          link expires in an hour.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          className="w-full"
          disabled={resending}
          onClick={resend}
          type="button"
          variant="outline"
        >
          {resending ? "Sending..." : "Resend email"}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          <Link className="underline underline-offset-4" href="/sign-in">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
