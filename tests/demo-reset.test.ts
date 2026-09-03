import { beforeEach, describe, expect, it } from "vitest";

import {
  DemoResetInProgressError,
  resetDemoWarehouse,
} from "@/server/services/demo-reset";

import { db, findDrift } from "./helpers/db";

const RESET_ACTOR_ID = "test-reset-actor";

beforeEach(async () => {
  await db.user.upsert({
    where: { id: RESET_ACTOR_ID },
    create: {
      id: RESET_ACTOR_ID,
      name: "Reset Actor",
      email: "reset-actor@nexstock.test",
      emailVerified: true,
      isDemo: true,
    },
    update: {},
  });
  await db.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: RESET_ACTOR_ID,
      },
    },
    create: {
      id: "test-reset-account",
      providerId: "credential",
      accountId: RESET_ACTOR_ID,
      userId: RESET_ACTOR_ID,
      password: "not-a-real-hash",
    },
    update: {},
  });
  await db.session.upsert({
    where: { token: "test-reset-session-token" },
    create: {
      id: "test-reset-session",
      token: "test-reset-session-token",
      userId: RESET_ACTOR_ID,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
    update: { expiresAt: new Date(Date.now() + 86_400_000) },
  });
});

describe("demo warehouse reset", () => {
  it("restores the walkthrough baseline atomically and prevents overlap", async () => {
    const initial = await resetDemoWarehouse(db, {
      actorId: RESET_ACTOR_ID,
    });

    expect(initial.counts.orders).toBe(50);
    expect(initial.counts.locations).toBe(22);
    await expect(findDrift()).resolves.toEqual([]);
    await expect(
      db.inventoryBalance.findFirst({
        where: { lpn: "LPN000002", location: "STAGE", quantity: { gt: 0 } },
      }),
    ).resolves.not.toBeNull();
    await expect(
      db.salesOrder.findUnique({ where: { orderNumber: "SO-00001" } }),
    ).resolves.toMatchObject({ status: "NEW" });

    await db.salesOrder.update({
      where: { orderNumber: "SO-00001" },
      data: { notes: "mutated by a visitor", status: "CANCELLED" },
    });

    await resetDemoWarehouse(db, { actorId: RESET_ACTOR_ID });
    await expect(
      db.salesOrder.findUnique({ where: { orderNumber: "SO-00001" } }),
    ).resolves.toMatchObject({ notes: null, status: "NEW" });
    await expect(findDrift()).resolves.toEqual([]);
    expect(await db.account.count({ where: { userId: RESET_ACTOR_ID } })).toBe(
      1,
    );
    expect(await db.session.count({ where: { userId: RESET_ACTOR_ID } })).toBe(
      1,
    );

    await db.salesOrder.update({
      where: { orderNumber: "SO-00001" },
      data: { notes: "preserve this complete dataset" },
    });
    await expect(
      resetDemoWarehouse(db, {
        actorId: RESET_ACTOR_ID,
        afterClear: async () => {
          throw new Error("injected reset failure");
        },
      }),
    ).rejects.toThrow("injected reset failure");
    await expect(
      db.salesOrder.findUnique({ where: { orderNumber: "SO-00001" } }),
    ).resolves.toMatchObject({ notes: "preserve this complete dataset" });

    let releaseReset!: () => void;
    let markStarted!: () => void;
    const resetStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const holdReset = new Promise<void>((resolve) => {
      releaseReset = resolve;
    });
    const firstReset = resetDemoWarehouse(db, {
      actorId: RESET_ACTOR_ID,
      afterClear: async () => {
        markStarted();
        await holdReset;
        throw new Error("release held reset");
      },
    });

    await resetStarted;
    await expect(
      resetDemoWarehouse(db, { actorId: RESET_ACTOR_ID }),
    ).rejects.toBeInstanceOf(DemoResetInProgressError);
    releaseReset();
    await expect(firstReset).rejects.toThrow("release held reset");
  }, 120_000);
});
