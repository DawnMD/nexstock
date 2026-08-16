/**
 * The read-only demo, driven through the browser as a demo visitor would be.
 *
 * `tests/demo-account.test.ts` proves the server refuses every mutation; this
 * checks the other half — that a demo visitor can actually sign in and reach the
 * screens, and is told why a write fails rather than being left guessing.
 */
import { expect, test } from "@playwright/test";

const DEMO = {
  email: "demo@demo.nexstock.app",
  password: "demo-password-1234",
};

// A fresh context each time: the stored operator session must not leak in.
test.use({ storageState: { cookies: [], origins: [] } });

test("a demo visitor signs in, sees the banner, and can browse", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard");

  await expect(page.getByText(/read-only demo/i)).toBeVisible();

  // Reads are not special-cased, so every screen works exactly as it does for
  // an operator.
  await page.goto("/inventory");
  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

  await page.goto("/sales-orders");
  await expect(
    page.getByRole("heading", { name: "Sales Orders" }),
  ).toBeVisible();
});

test("a write is refused with an explanation, not a crash", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard");

  // SO-00001 specifically: the seed leaves it NEW, so "Allocate stock" is
  // enabled. The list is newest-first and the newest seeded order has already
  // shipped, which disables the button for a reason that has nothing to do with
  // the demo guard.
  await page.goto("/sales-orders/SO-00001");
  await expect(page.getByText("Lines")).toBeVisible();

  // Deliberately not disabled for demo users — the guard is on the server, so
  // pressing it is what proves the guard rather than the UI is doing the work.
  const allocate = page.getByRole("button", { name: /Allocate stock/ });
  await expect(allocate).toBeEnabled();
  await allocate.click();

  await expect(page.getByText(/read-only demo account/i)).toBeVisible();
});
