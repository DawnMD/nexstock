import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The service layer is the thing under test and all of it is async work
    // against Postgres: row locks, `FOR UPDATE`, raw SQL and real transaction
    // semantics. Running files in parallel would have them truncating each
    // other's fixtures between statements.
    fileParallelism: false,
    sequence: { concurrent: false },
    // A deadlock in a lock test should fail, not hang the run.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ["tests/setup.ts"],
    // `env.ts` validates at import time, and importing an oRPC router reaches it
    // through `lib/auth.ts`. These are placeholders so that import succeeds —
    // the tests talk to Postgres through `tests/helpers/db.ts` and
    // `TEST_DATABASE_URL`, and nothing here sends mail or resolves a session.
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres@localhost:5433/nexstock_test",
      BETTER_AUTH_SECRET: "test-secret-0123456789012345678901234567890123",
      RESEND_API_KEY: "re_test_placeholder",
      DEMO_MODE: "shared-writable",
      DEMO_ACCOUNT_EMAIL: "shared-demo@nexstock.test",
      DEMO_ACCOUNT_PASSWORD: "nexstock-demo",
      ALLOW_SIGN_UP: "false",
      CRON_SECRET: "test-cron-secret-0123456789",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Importing an oRPC router reaches `lib/auth.ts` and `lib/email.ts`, which
      // are marked `server-only` — a package that throws unless the
      // `react-server` export condition is set. See the stub for why aliasing
      // it away costs nothing here.
      "server-only": fileURLToPath(
        new URL("./tests/helpers/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
