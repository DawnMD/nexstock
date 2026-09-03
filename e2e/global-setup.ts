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

/**
 * Run this project's package manager without relying on a platform-specific
 * shell shim. `execFile("pnpm")` works on Linux CI, but Windows installs pnpm
 * as `pnpm.cmd`, which Node cannot spawn through the extensionless name here.
 * pnpm exposes the JavaScript CLI that launched Playwright via `npm_execpath`,
 * so invoking that with the current Node binary works on both platforms.
 */
async function runPnpm(args: string[]) {
  const cli = process.env.npm_execpath;
  if (!cli) {
    throw new Error("pnpm did not expose npm_execpath to Playwright");
  }
  await run(process.execPath, [cli, ...args]);
}

export const OPERATOR = {
  email: "e2e-operator@nexstock.test",
  name: "E2E Operator",
  password: "e2e-password-1234",
};

/** The shared account `demo-account.spec.ts` signs in as. */
export const DEMO = {
  email: "demo@demo.nexstock.app",
  name: "Demo Visitor",
  password: "nexstock-demo",
};

const STORAGE_STATE = "e2e/.auth/operator.json";

/**
 * Accounts are provisioned out of band rather than through `/sign-up`, because
 * the résumé deployment disables registration and these tests should not need a
 * working Resend key. Shelling out rather than importing Better Auth directly
 * is deliberate too: `lib/auth.ts` pulls in `server-only`, which throws
 * outside a React server environment.
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
  try {
    const existing = await db.user.findMany({
      where: { email: OPERATOR.email },
      select: { email: true },
    });
    const emails = new Set(existing.map((user) => user.email));
    needsOperator = !emails.has(OPERATOR.email);
  } finally {
    await db.$disconnect();
  }

  if (needsOperator) {
    await runPnpm([
      "user:create",
      OPERATOR.email,
      OPERATOR.name,
      OPERATOR.password,
    ]);
  }

  // Idempotently replaces the published password, applies the demo flag and
  // restores the exact walkthrough baseline before the browser starts.
  await runPnpm(["demo:provision"]);
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
