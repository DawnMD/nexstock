import { afterAll, beforeAll, beforeEach } from "vitest";

import { db, resetWarehouse } from "./helpers/db";
import { ensureTestUser } from "./helpers/fixtures";

beforeAll(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (cause) {
    throw new Error(
      "Could not reach the test database. Start Postgres and point " +
        "TEST_DATABASE_URL at it, then run `prisma migrate deploy` against it. " +
        "See the testing section of the README.",
      { cause },
    );
  }

  await ensureTestUser();
});

// Each test starts from an empty warehouse. Truncating between tests rather than
// wrapping each in a rolled-back transaction is what lets the services open
// their own transactions and take their own row locks, which is most of what is
// being tested.
beforeEach(async () => {
  await resetWarehouse();
});

afterAll(async () => {
  await db.$disconnect();
});
