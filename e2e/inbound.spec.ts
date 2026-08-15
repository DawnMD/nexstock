/**
 * The inbound screens, driven through the browser against a real database.
 *
 * These are deliberately thin. The business rules are covered exhaustively in
 * `tests/` against the services directly; what is worth checking here is the
 * part that suite cannot see — that the routers and the screens are wired to
 * those services at all, that a session gets you through the guard, and that
 * data written by one screen shows up on the next.
 */
import { expect, test } from "@playwright/test";

test("an unauthenticated visitor is sent to sign-in", async ({ browser }) => {
  // A fresh context, without the stored operator session.
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);

  await context.close();
});

test("the dashboard loads for a signed-in operator", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total Orders")).toBeVisible();
});

test("orders list and drills into an order", async ({ page }) => {
  await page.goto("/orders");

  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

  // The seed creates orders; open the first one and check its detail screen
  // renders the line items the list promised. Located by its accessible name
  // rather than by an href pattern, since order numbers are vendor-supplied and
  // carry no fixed prefix.
  const firstOrderLink = page
    .getByRole("button", { name: "View order details" })
    .first();
  await expect(firstOrderLink).toBeVisible();
  await firstOrderLink.click();

  await expect(page).toHaveURL(/\/orders\/.+/);
  await expect(page.getByText("Line Items")).toBeVisible();
  // The corrected column headers — "Ordered" is the purchase order's own figure
  // again, with the adjustment shown separately rather than folded into it.
  await expect(
    page.getByRole("columnheader", { name: "Ordered" }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Adjusted" }),
  ).toBeVisible();
});

test("inventory reconciles: the ledger agrees with the balances", async ({
  page,
}) => {
  // `inventory.getDrift` is the invariant the whole inventory core rests on, and
  // the screen surfaces it rather than asking anyone to take it on trust. After
  // a seed it must be clean.
  await page.goto("/inventory");

  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.getByText(/units on hand/i).first()).toBeVisible();
  await expect(page.getByText(/drift|discrepanc/i)).toHaveCount(0);
});

test("the putaway worklist offers a pallet and its detail screen", async ({
  page,
}) => {
  await page.goto("/putaway");

  await expect(page.getByRole("heading", { name: "Putaway" })).toBeVisible();

  // The worklist is a cmdk command palette, so each pallet is an option that
  // navigates on select rather than a link.
  const firstLpn = page.getByRole("option").first();
  await expect(firstLpn).toBeVisible();
  await firstLpn.click();
  await expect(page).toHaveURL(/\/putaway\/.+/);

  await expect(page.getByText("LPN Details")).toBeVisible();
  // The reworked screen: a source picker and an editable quantity, where there
  // used to be a read-only box pinned to the receiving bay.
  await expect(page.getByLabel("Move From")).toBeVisible();
  await expect(page.getByLabel("Quantity to Putaway")).toBeEditable();
});

test("the locations master lists racks and their on-hand totals", async ({
  page,
}) => {
  await page.goto("/locations");

  await expect(page.getByRole("heading", { name: "Locations" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});
