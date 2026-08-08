import "server-only";

import type { Email } from "@/lib/email";

/**
 * Mail clients strip <style> blocks and most CSS, so every rule here is inline
 * and the layout is a single centred table cell. Nothing here is Tailwind.
 */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const layout = (body: string) => `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:18px;font-weight:600;">NexStock</p>
          ${body}
        </td>
      </tr>
    </table>
  </body>
</html>`;

/**
 * The link Better Auth hands us points at `/api/auth/verify-email?token=…`; it
 * carries the callback URL, so the button is the whole flow.
 */
export function verificationEmail({
  to,
  name,
  url,
  expiresInHours,
}: {
  to: string;
  name: string;
  url: string;
  expiresInHours: number;
}): Email {
  const greeting = name.trim() ? `Hi ${name.trim()}` : "Hi";

  return {
    to,
    subject: "Verify your NexStock email",
    html: layout(`
          <p style="margin:0 0 16px;font-size:14px;line-height:22px;">${escapeHtml(greeting)}, confirm this address to finish setting up your NexStock account.</p>
          <p style="margin:0 0 24px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background-color:#18181b;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px;">Verify email</a>
          </p>
          <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#52525b;">The link expires in ${expiresInHours} ${expiresInHours === 1 ? "hour" : "hours"}. If the button does not work, paste this into your browser:</p>
          <p style="margin:0 0 24px;font-size:12px;line-height:18px;color:#52525b;word-break:break-all;">${escapeHtml(url)}</p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#52525b;">If you did not create a NexStock account, ignore this email.</p>`),
    text: `${greeting}, confirm this address to finish setting up your NexStock account.

Verify your email: ${url}

The link expires in ${expiresInHours} ${expiresInHours === 1 ? "hour" : "hours"}.
If you did not create a NexStock account, ignore this email.`,
  };
}
