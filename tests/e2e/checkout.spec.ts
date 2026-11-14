import { expect, test } from "@playwright/test";

const CART_CHANGED = "Your cart changed after payment started. You will be charged the amount below.";

// Required test 1 (brief): Divergence. Full stack on the production server.
test("Divergence: pay for a notebook, add a pen, and the order is still the notebook at $15", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Add Field notebook" }).click();
  await expect(page.getByLabel("Cart total")).toHaveText("$15");

  await page.getByRole("button", { name: "Pay" }).click();
  const progress = page.getByRole("region", { name: "Payment in progress" });
  await expect(progress).toBeVisible();
  await expect(progress.getByRole("listitem")).toHaveText(["Field notebook × 1 — $15"]);

  await page.getByRole("button", { name: "Add Gel pen" }).click();
  await expect(page.getByLabel("Cart total")).toHaveText("$19");
  await expect(page.getByLabel("Amount due")).toHaveText("$15");
  await expect(page.getByRole("status").filter({ hasText: CART_CHANGED })).toHaveText(CART_CHANGED);

  await page.getByRole("button", { name: "Complete payment" }).click();
  const order = page.getByRole("region", { name: "Order placed" });
  await expect(order.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expect(order.getByRole("listitem")).toHaveText(["Field notebook × 1 — $15"]);
  await expect(page.getByLabel("Amount charged")).toHaveText("$15");
});

test("Pay with an empty cart shows 'Add an item before paying' and starts no attempt", async ({ page }) => {
  const checkoutRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/checkout/")) checkoutRequests.push(request.url());
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByText("Add an item before paying", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Payment in progress" })).toHaveCount(0);
  expect(checkoutRequests).toEqual([]);
});
