"use client";

import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const resendSchema = z.object({ email: z.email() });

/**
 * Asks for the address again rather than carrying it in the URL: a dead link is
 * the only way onto this screen, and the token in it is already spent.
 */
export function ResendVerificationForm() {
  const form = useForm<z.infer<typeof resendSchema>>({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: z.infer<typeof resendSchema>) => {
    const { error } = await authClient.sendVerificationEmail({
      email: values.email,
      callbackURL: VERIFY_EMAIL_CALLBACK_URL,
    });

    if (error) {
      toast.error(error.message ?? "Could not send the email");
      return;
    }

    // Better Auth answers the same way whether or not the address has an
    // unverified account, so the copy stays vague on purpose.
    toast.success("If that address needs verifying, a new link is on its way");
    form.reset();
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel htmlFor="resend-email">Email</FormLabel>
              <FormControl>
                <Input
                  id="resend-email"
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

        <Button
          className="w-full"
          disabled={form.formState.isSubmitting}
          type="submit"
        >
          {form.formState.isSubmitting ? "Sending..." : "Send a new link"}
        </Button>
      </form>
    </Form>
  );
}
