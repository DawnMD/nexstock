/**
 * The reports screen and its CSV export.
 *
 * The export is worth an end-to-end test specifically because it is a route
 * handler rather than an oRPC procedure — nothing else in the suite exercises
 * that path, and "the browser gets a file with the right headers" is not
 * something a unit test can see.
 */
import { expect, test } from "@playwright/test";

test("the reports screen shows headline tiles and renders a chart", async ({
  page,
}) => {
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

  await expect(page.getByText("Units received", { exact: true })).toBeVisible();
  await expect(page.getByText("Units on hand")).toBeVisible();

  // Recharts draws into an SVG, so its presence is the check that the chart
  // actually rendered rather than throwing inside the client component.
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
});

test("each tab loads its report", async ({ page }) => {
  await page.goto("/reports");

  await page.getByRole("tab", { name: "Inventory" }).click();
  await expect(page.getByText("Stock aging")).toBeVisible();
  // The aging chart ships a table view alongside it, so the numbers are
  // readable without relying on colour.
  await expect(page.getByRole("columnheader", { name: "Age" })).toBeVisible();
  // The utilisation query lives on the same tab and is easy to leave silently
  // broken — it threw a Postgres 42883 on every call until its casts were fixed.
  await expect(page.getByText("Location utilisation")).toBeVisible();

  await page.getByRole("tab", { name: "Quality" }).click();
  await expect(page.getByText("Reject rate by SKU")).toBeVisible();

  await page.getByRole("tab", { name: "Docks" }).click();
  await expect(page.getByText("Dock turnaround")).toBeVisible();
});

test("exports a CSV with the right headers and content", async ({ page }) => {
  await page.goto("/reports");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV" }).first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^receiving-throughput-\d{4}-\d{2}-\d{2}\.csv$/,
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of await download.createReadStream()) {
    chunks.push(new Uint8Array(chunk as ArrayBufferLike));
  }
  const body = Buffer.concat(chunks).toString("utf8");

  // Leading BOM, so Excel opens it as UTF-8 rather than the system codepage.
  expect(body.charCodeAt(0)).toBe(0xfeff);
  expect(body).toContain("Day,Receipts,Units");
  expect(body).toContain("\r\n");
});

test("the export refuses an unknown report and an anonymous caller", async ({
  page,
  browser,
}) => {
  const notFound = await page.request.get("/api/reports/not-a-report");
  expect(notFound.status()).toBe(404);

  // Reports are warehouse data, so the route carries the same session guard the
  // screens do.
  const anonymous = await browser.newContext({ storageState: undefined });
  const response = await anonymous.request.get("/api/reports/receiving");
  expect(response.status()).toBe(401);
  await anonymous.close();
});
