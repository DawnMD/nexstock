import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Next loads `.env` for the server it runs, but `global-setup.ts` executes in
// Playwright's own Node process, where nothing has populated `process.env` yet —
// and it imports `@/env`, which validates at module load. Same precedence as
// `prisma/script-env.ts`: dotenv keeps the first value it sees, so `.env.local`
// wins over `.env`.
loadEnv({ path: [".env.local", ".env"], quiet: true });

// The browser suite exercises the public résumé deployment contract regardless
// of the developer's local defaults.
process.env.DEMO_MODE = "shared-writable";
process.env.DEMO_ACCOUNT_EMAIL = "demo@demo.nexstock.app";
process.env.DEMO_ACCOUNT_PASSWORD = "nexstock-demo";
process.env.ALLOW_SIGN_UP = "false";
process.env.CRON_SECRET = "e2e-demo-reset-secret-0123456789";

/**
 * End-to-end tests drive the real app: a Next production build, a real Postgres
 * behind it, and a real Better Auth session. They cover what the Vitest suite
 * cannot — that the oRPC routers and the React screens are actually wired to the
 * services underneath them.
 *
 * `e2e/global-setup.ts` seeds the database and signs an operator in once; every
 * spec reuses that storage state rather than logging in again.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // The specs share one seeded database, so they run in order rather than
  // racing each other over the same orders.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    storageState: "e2e/.auth/operator.json",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Escape hatch for environments that already ship a Chromium whose
        // build number does not match this Playwright release — point
        // PLAYWRIGHT_CHROMIUM_PATH at it instead of downloading another. CI
        // leaves it unset and uses `playwright install`.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? {
              launchOptions: {
                executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
              },
            }
          : {}),
      },
    },
  ],
  webServer: {
    // The production build, not `next dev`: dev-mode compilation makes the first
    // visit to every route slow enough to look like a hang.
    command: `pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
