/**
 * One-time setup for the end-to-end run: make sure there is an operator to sign
 * in as, sign them in through the real form, and save the session so the specs
 * start already authenticated.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { chromium, type FullConfig } from "@playwright/test";
import { PrismaClient } from "@/generated/prisma/client";
import { createAdapter } from "@/lib/prisma-adapter";

const run = promisify(execFile);

export const OPERATOR = {
  email: "e2e-operator@nexstock.test",
  name: "E2E Operator",
  password: "e2e-password-1234",
};

/** The read-only account `demo-account.spec.ts` signs in as. */
export const DEMO = {
  email: "demo@demo.nexstock.app",
  name: "Demo Visitor",
  password: "demo-password-1234",
};

const STORAGE_STATE = "e2e/.auth/operator.json";

/**
 * The account is created with `pnpm user:create` rather than through `/sign-up`,
 * because sign-up is gated on a verification email and these tests should not
 * need a working Resend key. Shelling out to the script rather than importing
 * Better Auth directly is deliberate too: `lib/auth.ts` pulls in `server-only`,
 * which throws outside a React server environment.
 */
async function ensureAccounts() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the end-to-end database before running Playwright.",
    );
  }

  const db = new PrismaClient({ adapter: createAdapter(connectionString) });

  let needsOperator = true;
  let needsDemo = true;
  try {
    const existing = await db.user.findMany({
      where: { email: { in: [OPERATOR.email, DEMO.email] } },
      select: { email: true },
    });
    const emails = new Set(existing.map((user) => user.email));
    needsOperator = !emails.has(OPERATOR.email);
    needsDemo = !emails.has(DEMO.email);
  } finally {
    await db.$disconnect();
  }

  if (needsOperator) {
    await run("pnpm", [
      "user:create",
      OPERATOR.email,
      OPERATOR.name,
      OPERATOR.password,
    ]);
  }

  if (needsDemo) {
    await run("pnpm", [
      "user:create",
      DEMO.email,
      DEMO.name,
      DEMO.password,
      "--demo",
    ]);
  }
}

export default async function globalSetup(config: FullConfig) {
  await ensureAccounts();

  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("No baseURL configured for the e2e project");

  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  );
  const page = await browser.newPage({ baseURL });

  // Signing in through the form rather than forging a cookie, so a broken
  // sign-in screen fails the run here rather than silently passing everywhere.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(OPERATOR.email);
  await page.getByLabel("Password").fill(OPERATOR.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });

  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
