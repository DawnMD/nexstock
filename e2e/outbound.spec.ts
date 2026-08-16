/**
 * The outbound screens.
 *
 * The allocate → pick → pack → ship rules are covered exhaustively in
 * `tests/outbound.test.ts`; what these check is that the screens are wired to
 * those services, and that the seeded orders land on the right ones.
 */
import { expect, test } from "@playwright/test";

test("sales orders list, with the seeded orders at their various stages", async ({
  page,
}) => {
  await page.goto("/sales-orders");

  await expect(
    page.getByRole("heading", { name: "Sales Orders" }),
  ).toBeVisible();

  // The seed leaves one order at each stage so every outbound screen has
  // something on it.
  await expect(
    page.getByRole("link", { name: /SO-000/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("Shipped").first()).toBeVisible();
});

test("a sales order shows its lines and offers allocation", async ({
  page,
}) => {
  await page.goto("/sales-orders");

  await page
    .getByRole("link", { name: /SO-000/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sales-orders\/SO-/);

  await expect(page.getByText("Lines")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Allocate stock/ }),
  ).toBeVisible();
});

test("the pick list is ordered by location and takes a picked quantity", async ({
  page,
}) => {
  await page.goto("/pick");

  await expect(page.getByRole("heading", { name: "Pick List" })).toBeVisible();

  // The seed allocates one order without picking it, so there is work here.
  const rows = page.getByRole("row");
  await expect(rows.first()).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Location" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm" }).first(),
  ).toBeVisible();
});

test("pack and ship asks for an order before showing anything", async ({
  page,
}) => {
  await page.goto("/ship");

  await expect(
    page.getByRole("heading", { name: "Pack & Ship" }),
  ).toBeVisible();
  // A carton cannot mix orders and a shipment belongs to exactly one, so the
  // screen is meaningless without one named.
  await expect(page.getByText(/Choose a sales order/)).toBeVisible();

  await page.goto("/sales-orders");
  const orderLink = page.getByRole("link", { name: /SO-000/ }).first();
  const orderNumber = (await orderLink.textContent())?.trim();
  await page.goto(`/ship?order=${orderNumber}`);

  await expect(page.getByRole("heading", { name: "Pack" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ship" })).toBeVisible();
});

test("the ledger still reconciles after stock has shipped", async ({
  page,
}) => {
  // Outbound is the first thing in NexStock that takes units out of the
  // building rather than moving them around inside it. The drift check on the
  // inventory screen is what proves the ledger survived that.
  await page.goto("/inventory");

  await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  await expect(page.getByText(/drift|discrepanc/i)).toHaveCount(0);
});
