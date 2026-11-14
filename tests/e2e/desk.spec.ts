import { expect, test, type Page } from "@playwright/test";
import { liveStock, newChargeId } from "./support/api";

// Production server shared with other specs. Stock budget for this file: one
// Cedar stool and one Maple lamp (see docs/IMPLEMENTATION_PROGRESS.md).
const field = (page: Page, label: "Email" | "Item" | "Extra" | "Charge id") => page.getByLabel(label, { exact: true });
const previewRegion = (page: Page) => page.getByRole("region", { name: "Payment preview" });
const queue = (page: Page) => page.getByRole("region", { name: "Payment queue" });
const status = (page: Page) => page.getByRole("status").filter({ hasNotText: /items?$/ });

async function openDesk(page: Page) {
  await page.goto("/desk");
  await expect(field(page, "Email")).toBeEditable();
  await expect(queue(page)).toBeVisible();
}

async function fill(page: Page, values: { email: string; item: string; extra?: string; chargeId: string }) {
  await field(page, "Email").fill(values.email);
  await field(page, "Item").selectOption({ label: values.item });
  if (values.extra) await field(page, "Extra").selectOption({ label: values.extra });
  await field(page, "Charge id").fill(values.chargeId);
}

test.describe("/desk", () => {
  test("has the four labelled fields, only lamp and stool, and both actions", async ({ page }) => {
    await openDesk(page);
    await expect(page).toHaveTitle("Desk | Shop counter");
    const items = field(page, "Item").locator("option:not([value=''])");
    await expect(items).toHaveText(["Maple lamp", "Cedar stool"]);
    await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    await expect(queue(page).getByRole("heading", { name: "Payment queue" })).toBeVisible();
  });

  test("shows 'No payments recorded' while nothing has been sold", async ({ page, request }) => {
    const untouched = (await liveStock(request, "lamp")) === 5 && (await liveStock(request, "stool")) === 2;
    test.skip(!untouched, "another spec already recorded a payment on this server");
    await openDesk(page);
    await expect(queue(page).getByText("No payments recorded", { exact: true })).toBeVisible();
  });

  test("keyboard only: Tab reaches every control, Enter submits, errors are announced on their fields", async ({
    page,
  }) => {
    await openDesk(page);
    await field(page, "Email").focus();
    const order: (string | null)[] = [];
    for (let i = 0; i < 6; i++) {
      order.push(await page.evaluate(() => document.activeElement?.getAttribute("id")?.split("-").pop() ?? document.activeElement?.textContent ?? null));
      await page.keyboard.press("Tab");
    }
    expect(order).toEqual(["email", "sku", "extraCode", "externalChargeId", "Preview", "Record payment"]);

    await field(page, "Email").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Enter a valid email", { exact: true })).toBeVisible();
    await expect(page.getByText("Choose an item", { exact: true })).toBeVisible();
    await expect(page.getByText("Enter a charge id like ch_12345678", { exact: true })).toBeVisible();
    await expect(field(page, "Email")).toBeFocused();
    await expect(field(page, "Email")).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, "Email")).toHaveAccessibleDescription("Enter a valid email");
  });

  test("choosing Maple lamp clears a selected Cushion", async ({ page }) => {
    await openDesk(page);
    await field(page, "Item").selectOption({ label: "Cedar stool" });
    await field(page, "Extra").selectOption({ label: "Cushion (+$25)" });
    await expect(field(page, "Extra")).toHaveValue("cushion");
    await field(page, "Item").selectOption({ label: "Maple lamp" });
    await expect(field(page, "Extra")).toHaveValue("");
    await expect(field(page, "Extra").locator("option")).toHaveText(["None"]);
  });

  test("Preview shows the payment without changing stock, and clears when a field changes", async ({ page, request }) => {
    const stoolBefore = (await liveStock(request, "stool"))!;
    await openDesk(page);
    await fill(page, { email: "Grace@Example.com", item: "Cedar stool", extra: "Cushion (+$25)", chargeId: newChargeId() });
    await page.getByRole("button", { name: "Preview" }).click();

    const region = previewRegion(page);
    await expect(region.getByText("grace@example.com")).toBeVisible();
    await expect(region.getByText("Cedar stool")).toBeVisible();
    await expect(region.getByText("Cushion", { exact: true })).toBeVisible();
    await expect(region.getByText("$145")).toBeVisible();
    await expect(region.getByText(`${stoolBefore - 1} left`)).toBeVisible();
    expect(await liveStock(request, "stool")).toBe(stoolBefore);

    await field(page, "Item").selectOption({ label: "Maple lamp" });
    await expect(region.getByText("$145")).toHaveCount(0);
  });

  test("Record payment adds a queue row and takes stock; recording the same charge id again changes nothing", async ({
    page,
    request,
  }) => {
    const stoolBefore = (await liveStock(request, "stool"))!;
    const chargeId = newChargeId();
    await openDesk(page);
    await fill(page, { email: " Grace@Example.com ", item: "Cedar stool", extra: "Cushion (+$25)", chargeId });
    await page.getByRole("button", { name: "Record payment" }).click();

    await expect(status(page)).toHaveText(`Payment recorded: Cedar stool, $145, ${chargeId}.`);
    const row = queue(page).getByRole("row").filter({ hasText: chargeId });
    await expect(row.getByRole("cell")).toHaveText(["grace@example.com", "Cedar stool", "$145", chargeId]);
    expect(await liveStock(request, "stool")).toBe(stoolBefore - 1);
    await expect(field(page, "Charge id")).toHaveValue("");

    // Same charge id, different item: the original payment, no new row, no stock change.
    await fill(page, { email: "someone@example.com", item: "Maple lamp", chargeId });
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(status(page)).toHaveText(
      `Charge ${chargeId} was already recorded (Cedar stool, $145). Nothing was charged again.`,
    );
    await expect(queue(page).getByRole("row").filter({ hasText: chargeId })).toHaveCount(1);
    expect(await liveStock(request, "stool")).toBe(stoolBefore - 1);

    await page.reload();
    await expect(queue(page).getByRole("row").filter({ hasText: chargeId })).toHaveCount(1);
  });

  test("after recording, the shop shows new stock via a link, browser Back, and Forward", async ({ page, request }) => {
    const before = (await liveStock(request, "lamp"))!;
    const stockOnPage = () => page.getByText("Stock").locator("+ dd");

    await page.goto("/shop/lamp");
    await expect(stockOnPage()).toHaveText(`${before} left`);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Desk" }).click();
    await expect(page).toHaveURL(/\/desk$/);
    await expect(field(page, "Email")).toBeEditable();

    const chargeId = newChargeId();
    await fill(page, { email: "ada@example.com", item: "Maple lamp", chargeId });
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(status(page)).toHaveText(`Payment recorded: Maple lamp, $80, ${chargeId}.`);
    await expect(queue(page).getByRole("row").filter({ hasText: chargeId })).toHaveCount(1);

    // Browser Back to the item page viewed before the payment.
    await page.goBack();
    await expect(page).toHaveURL(/\/shop\/lamp$/);
    await expect(stockOnPage()).toHaveText(`${before - 1} left`);

    // Forward to the desk: the new payment is still in the queue.
    await page.goForward();
    await expect(page).toHaveURL(/\/desk$/);
    await expect(queue(page).getByRole("row").filter({ hasText: chargeId })).toHaveCount(1);

    // And a normal link to the shop list.
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop" }).click();
    const lampCard = page.getByRole("list", { name: "Products" }).getByRole("listitem").filter({ hasText: "Maple lamp" });
    await expect(lampCard.getByText(/left$/)).toHaveText(`${before - 1} left`);
  });
});
