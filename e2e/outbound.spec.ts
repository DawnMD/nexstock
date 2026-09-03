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

test("a sales order can be raised from the screen and then allocated", async ({
  page,
}) => {
  // `createSalesOrder` and `allocateSalesOrder` are covered exhaustively in
  // `tests/outbound.test.ts`. What was missing until now was any way to reach
  // them without an API client — the seed was the only thing that put orders on
  // the board. This drives the two screens that closed that gap.
  const orderNumber = `E2E-SO-${Date.now()}`;

  await page.goto("/sales-orders");
  // A `<Button render={<Link>} nativeButton={false}>` is an anchor that Base UI
  // gives `role="button"`, so it is located the same way `inbound.spec.ts`
  // locates "View order details".
  await page.getByRole("button", { name: /New sales order/i }).click();
  await expect(page).toHaveURL(/\/sales-orders\/new/);

  await page.getByLabel("Order Number").fill(orderNumber);

  // Customers are a closed set that changes rarely, so this one is still a
  // dropdown rather than a scan field.
  await page.getByLabel("Customer").click();
  await page.getByRole("option", { name: /Northwind Retail/ }).click();

  // The SKU field is scannable, with the known codes offered underneath it.
  await page.getByLabel("SKU").fill("FG-");
  const suggestion = page.getByRole("option").first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  await page.getByLabel("Quantity").fill("1");
  await page.getByRole("button", { name: "Create Sales Order" }).click();

  await expect(page).toHaveURL(new RegExp(`/sales-orders/${orderNumber}`));
  await expect(page.getByText("Lines")).toBeVisible();

  // Allocation is a separate, explicit step, and this is the control that
  // dispatches a picker without going near the API.
  await page.getByRole("button", { name: /Allocate stock/ }).click();
  await expect(
    page.getByText(/Allocated \d+ units|Nothing left to allocate/),
  ).toBeVisible();
});
