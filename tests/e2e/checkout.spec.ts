import { expect, test } from "@playwright/test";

const CHANGED = "Your cart changed after payment started. You will be charged the amount below.";

test("divergence: the order is the cart as it was when Pay was pressed", async ({ page }) => {
  await page.goto("/checkout");

  await page.getByRole("button", { name: "Add Field notebook" }).click();
  await expect(page.getByLabel("Cart total")).toHaveText("$15");
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  const inProgress = page.getByRole("region", { name: "Payment in progress" });
  await expect(inProgress.getByLabel("Amount due")).toHaveText("$15");

  await page.getByRole("button", { name: "Add Gel pen" }).click();
  await expect(page.getByLabel("Cart total")).toHaveText("$19");
  await expect(inProgress.getByLabel("Amount due")).toHaveText("$15");
  await expect(page.getByText(CHANGED)).toBeVisible();

  await inProgress.getByRole("button", { name: "Complete payment" }).click();

  const placed = page.getByRole("region", { name: "Order placed" });
  await expect(placed.getByRole("heading", { name: "Order placed" })).toBeFocused();
  await expect(placed.getByLabel("Amount charged")).toHaveText("$15");
  await expect(placed.getByRole("listitem")).toHaveText([/Field notebook × 1/]);
});

test("Pay with an empty cart asks for an item and starts no attempt", async ({ page }) => {
  const begins: string[] = [];
  page.on("request", (req) => req.url().includes("/api/checkout/begin") && begins.push(req.url()));

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  // (Next adds its own empty role="alert" route announcer, hence the filter.)
  await expect(page.getByRole("alert").filter({ hasText: "Add an item before paying" })).toBeVisible();
  expect(begins).toHaveLength(0);
});
