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
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
