import { expect, test } from "@playwright/test";

test("staff desk previews, records and replays a payment", async ({ page }) => {
  await page.goto("/desk");
  const queue = page.getByRole("region", { name: "Payment queue" });
  const chargeId = `ch_desk${Date.now()}`;

  await page.getByLabel("Email").fill("  Grace@Example.com ");
  await page.getByLabel("Item").selectOption("stool");
  await page.getByLabel("Extra").selectOption("cushion");
  await page.getByLabel("Charge id").fill(chargeId);

  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("region", { name: "Payment preview" });
  await expect(preview).toContainText("grace@example.com");
  await expect(preview).toContainText("Cushion");
  await expect(preview).toContainText("$145");

  // Choosing Maple lamp clears the cushion.
  await page.getByLabel("Item").selectOption("lamp");
  await expect(page.getByLabel("Extra")).toHaveValue("");
  await page.getByLabel("Item").selectOption("stool");
  await page.getByLabel("Extra").selectOption("cushion");

  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText(/Payment recorded: Cedar stool for grace@example.com, \$145/)).toBeVisible();

  const row = queue.getByRole("row").filter({ hasText: chargeId });
  await expect(row).toContainText("grace@example.com");
  await expect(row).toContainText("Cedar stool");
  await expect(row).toContainText("$145");

  // Same charge id again: replayed, queue unchanged.
  const rowsBefore = await queue.getByRole("row").count();
  await page.getByLabel("Email").fill("grace@example.com");
  await page.getByLabel("Item").selectOption("lamp");
  await page.getByLabel("Charge id").fill(chargeId);
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText(/was already recorded/)).toBeVisible();
  await page.reload();
  await expect(queue.getByRole("row")).toHaveCount(rowsBefore);
});

test("desk shows validation messages from validatePayment", async ({ page }) => {
  await page.goto("/desk");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByText("Choose an item")).toBeVisible();
  await expect(page.getByText("Enter a charge id like ch_12345678")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeFocused();
});
