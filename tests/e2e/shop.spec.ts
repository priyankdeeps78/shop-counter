import { expect, test, type Page } from "@playwright/test";

const ALL_ITEMS = ["Cedar stool", "Field notebook", "Gel pen", "Maple lamp", "Slip case"];

const items = (page: Page) => page.getByRole("list", { name: "Items" }).getByRole("listitem");

test("URL filter: search lives in ?q=, survives reload, and Back restores the list", async ({ page }) => {
  await page.goto("/shop");
  await expect(items(page)).toHaveCount(5);

  // Real keystrokes, so this also proves typing makes one history entry, not four.
  await page.getByLabel("Search").pressSequentially("lamp");

  await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toHaveText([/Maple lamp/]);

  await page.reload();
  await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
  await expect(page.getByLabel("Search")).toHaveValue("lamp");
  await expect(items(page)).toHaveCount(1);
  await expect(items(page)).toHaveText([/Maple lamp/]);

  await page.goBack();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(items(page)).toHaveCount(5);
  await expect(items(page)).toHaveText(ALL_ITEMS.map((name) => new RegExp(name)));
  await expect(page.getByLabel("Search")).toHaveValue("");
});

test("loading a filtered URL directly renders the filtered list on the server", async ({ page, request }) => {
  const html = await (await request.get("/shop?q=sto&sort=price-desc")).text();
  expect(html).toContain("Cedar stool");
  expect(html).not.toContain("Maple lamp");

  await page.goto("/shop?q=sto&sort=price-desc");
  await expect(items(page)).toHaveText([/Cedar stool/]);
  await expect(page.getByLabel("Sort")).toHaveValue("price-desc");
});

test("sort is in the URL and Back returns to the previous order", async ({ page }) => {
  await page.goto("/shop");
  await page.getByLabel("Sort").selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(items(page).first()).toContainText("Gel pen");

  await page.getByLabel("Sort").selectOption("price-desc");
  await expect(items(page).first()).toContainText("Cedar stool");

  await page.goBack();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(items(page).first()).toContainText("Gel pen");
  await expect(page.getByLabel("Sort")).toHaveValue("price-asc");
});

test("no match shows a message", async ({ page }) => {
  await page.goto("/shop?q=teapot");
  await expect(page.getByText("No items match")).toBeVisible();
});

test("list shows price and stock, and links to the item", async ({ page }) => {
  await page.goto("/shop");
  await expect(items(page).filter({ hasText: "Field notebook" })).toContainText("$15");
  await expect(items(page).filter({ hasText: "Field notebook" })).toContainText("Not stock-limited");
  await expect(items(page).filter({ hasText: "Cedar stool" })).toContainText(/\d+ left/);

  await page.getByRole("link", { name: "Cedar stool" }).click();
  await expect(page).toHaveURL(/\/shop\/stool$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cedar stool");
});

test("item page has a title, a description, and the extras", async ({ page }) => {
  await page.goto("/shop/stool");
  await expect(page).toHaveTitle("Cedar stool | Shop counter");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Cedar stool, \$120/);
  await expect(page.getByText("Cushion $25")).toBeVisible();
});

test("an unknown sku answers HTTP 404 with the not-found page", async ({ page }) => {
  const response = await page.goto("/shop/teapot");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});
