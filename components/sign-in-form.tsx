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
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

interface SignInFormProps {
  allowSignUp: boolean;
  demoCredentials?: {
    email: string;
    password: string;
    writable: boolean;
  };
}

export function SignInForm({ allowSignUp, demoCredentials }: SignInFormProps) {
  const router = useRouter();

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      // Only used on the unverified-account path below, where Better Auth sends
      // a fresh verification email instead of a session.
      callbackURL: VERIFY_EMAIL_CALLBACK_URL,
    });

    if (error) {
      // The password was right but the address was never confirmed. Better Auth
      // has already mailed a new link (`emailVerification.sendOnSignIn`), so say
      // so rather than showing a credentials error.
      if (error.code === "EMAIL_NOT_VERIFIED") {
        toast.error("Verify your email first — we've sent you a new link");
        return;
      }

      // Better Auth returns a generic message on bad credentials by design; don't
      // leak whether the account exists.
      toast.error(error.message ?? "Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh(); // RSCs must re-render with the new session cookie
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access NexStock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {demoCredentials && (
              <div className="bg-muted/60 space-y-3 rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Try the live demo</p>
                  <p className="text-muted-foreground text-xs">
                    {demoCredentials.writable
                      ? "Shared warehouse access — your changes are visible to other visitors."
                      : "Browse the warehouse with the published read-only account."}
                  </p>
                </div>
                <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all select-all">
                    {demoCredentials.email}
                  </dd>
                  <dt className="text-muted-foreground">Password</dt>
                  <dd className="select-all">{demoCredentials.password}</dd>
                </dl>
              </div>
            )}
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
                      autoComplete="current-password"
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
              {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>

            {allowSignUp && (
              <p className="text-muted-foreground text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link className="underline underline-offset-4" href="/sign-up">
                  Create one
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
