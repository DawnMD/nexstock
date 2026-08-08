import "server-only";

import { Resend } from "resend";

import { env } from "@/env";

// Constructed on first send rather than at module scope: `lib/auth.ts` is pulled
// into every RSC render, and there is no reason for a page view that never mails
// anything to build a client.
let client: Resend | undefined;
const resend = () => (client ??= new Resend(env.RESEND_API_KEY));

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Send one transactional email. Throws on a Resend-side failure — Better Auth
 * awaits `sendVerificationEmail`, so throwing turns "the mail never left" into a
 * failed sign-up the operator can see instead of an inbox they wait on forever.
 */
export async function sendEmail({ to, subject, html, text }: Email) {
  const { error } = await resend().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend rejected "${subject}": ${error.message}`);
  }
}
