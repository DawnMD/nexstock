import { expect, test } from "@playwright/test";

const DEMO = {
  email: "demo@demo.nexstock.app",
  password: "nexstock-demo",
};

test.use({ storageState: { cookies: [], origins: [] } });

test("the shared demo completes a write and reset restores the tour fixtures", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto("/sign-in");
  await expect(page.getByText(DEMO.email, { exact: true })).toBeVisible();
  await expect(page.getByText(DEMO.password, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /create one/i }),
  ).not.toBeVisible();
  expect((await page.request.get("/sign-up")).status()).toBe(404);

  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard");

  await expect(page.getByText(/shared demo warehouse/i)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Inspect inventory integrity/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Complete an inbound task/i }),
  ).toHaveAttribute("href", "/putaway/LPN000002");
  await expect(
    page.getByRole("link", { name: /Run an outbound workflow/i }),
  ).toHaveAttribute("href", "/sales-orders/SO-00001");

  await page.goto("/sales-orders/SO-00001");
  await expect(page.getByText("NEW", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Allocate stock/ }).click();
  await expect(
    page.getByText("ALLOCATED", { exact: true }).first(),
  ).toBeVisible();

  const reset = await page.request.get("/api/internal/demo-reset", {
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    timeout: 150_000,
  });
  expect(reset.status()).toBe(200);

  await page.reload();
  await expect(page.getByText("NEW", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Allocate stock/ }),
  ).toBeEnabled();

  await page.goto("/putaway/LPN000002");
  await expect(page.getByText("LPN000002", { exact: true })).toBeVisible();
  await expect(page.getByText("STAGE", { exact: true }).first()).toBeVisible();
});
