import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** axe-core WCAG 2.x A/AA rules. It catches roughly a third of real issues; see ARCHITECTURE.md for the manual checks. */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

for (const path of ["/", "/shop", "/shop?q=teapot", "/shop/stool", "/shop/teapot", "/desk", "/checkout"]) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

test("no axe violations on the desk with errors and a preview", async ({ page }) => {
  await page.goto("/desk");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expectNoViolations(page);

  await page.getByLabel("Email").fill("a11y@example.com");
  await page.getByLabel("Item").selectOption("stool");
  await page.getByLabel("Charge id").fill("ch_a11ycheck1");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("region", { name: "Payment preview" })).toContainText("a11y@example.com");
  await expectNoViolations(page);
});

test("no axe violations on checkout mid-payment and after the order", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Add Gel pen" }).click();
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  await page.getByRole("button", { name: "Increase Gel pen" }).click();
  await expect(page.getByText(/Your cart changed/)).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole("button", { name: "Complete payment" }).click();
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await expectNoViolations(page);
});

test("the shop can be filtered with the keyboard alone", async ({ page }) => {
  await page.goto("/shop");
  await page.keyboard.press("Tab"); // skip link
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByLabel("Search").focus();
  await page.keyboard.type("pen");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=pen/);
  await expect(page.getByRole("list", { name: "Items" }).getByRole("listitem")).toHaveText([/Gel pen/]);
});
