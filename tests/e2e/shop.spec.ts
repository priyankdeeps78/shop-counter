import { expect, test, type Page } from "@playwright/test";

const ALL_BY_NAME = ["Cedar stool", "Field notebook", "Gel pen", "Maple lamp", "Slip case"];

const productList = (page: Page) => page.getByRole("list", { name: "Products" });
const productNames = (page: Page) => productList(page).getByRole("heading", { level: 2 });
const searchBox = (page: Page) => page.getByLabel("Search");
const sortSelect = (page: Page) => page.getByLabel("Sort");

/**
 * Click into Search, then type key by key. The click waits until the field is
 * visible: on a full page load the streamed list and controls are revealed a
 * few hundred ms after `load`, and `pressSequentially` alone does not wait.
 */
async function typeSearch(page: Page, text: string) {
  await searchBox(page).click();
  await searchBox(page).pressSequentially(text);
}

test.describe("/shop", () => {
  // Required test 3: URL filter.
  test("search lives in ?q=, survives reload, and Back returns to all five", async ({ page }) => {
    await page.goto("/shop");
    await expect(productList(page).getByRole("listitem")).toHaveCount(5);

    await typeSearch(page, "lamp");
    await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
    await expect(productNames(page)).toHaveText(["Maple lamp"]);

    await page.reload();
    await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
    await expect(searchBox(page)).toHaveValue("lamp");
    await expect(productNames(page)).toHaveText(["Maple lamp"]);

    await page.goBack();
    await expect(page).not.toHaveURL(/q=/);
    await expect(productList(page).getByRole("listitem")).toHaveCount(5);
    await expect(productNames(page)).toHaveText(ALL_BY_NAME);
    await expect(searchBox(page)).toHaveValue("");
  });

  test("lists every item with name, price, stock, and a link to its page", async ({ page }) => {
    await page.goto("/shop");
    await expect(productNames(page)).toHaveText(ALL_BY_NAME);

    const expected = [
      { name: "Cedar stool", sku: "stool", price: "$120", stock: /^\d+ left$/ },
      { name: "Field notebook", sku: "notebook", price: "$15", stock: /^Not stock-limited$/ },
      { name: "Gel pen", sku: "pen", price: "$4", stock: /^Not stock-limited$/ },
      { name: "Maple lamp", sku: "lamp", price: "$80", stock: /^\d+ left$/ },
      { name: "Slip case", sku: "case", price: "$22", stock: /^Not stock-limited$/ },
    ];
    const items = productList(page).getByRole("listitem");
    for (const [index, item] of expected.entries()) {
      const card = items.nth(index);
      await expect(card.getByRole("link", { name: item.name })).toHaveAttribute("href", `/shop/${item.sku}`);
      await expect(card.getByText(item.price, { exact: true })).toBeVisible();
      await expect(card.getByText(item.stock)).toBeVisible();
    }
  });

  test("a direct link to /shop?q=sto&sort=price-desc shows only Cedar stool", async ({ page }) => {
    await page.goto("/shop?q=sto&sort=price-desc");
    await expect(productNames(page)).toHaveText(["Cedar stool"]);
    await expect(searchBox(page)).toHaveValue("sto");
    await expect(sortSelect(page)).toHaveValue("price-desc");
  });

  test("search ignores case", async ({ page }) => {
    await page.goto("/shop?q=MAPLE");
    await expect(productNames(page)).toHaveText(["Maple lamp"]);
  });

  test("no match shows 'No items match'", async ({ page }) => {
    await page.goto("/shop");
    await typeSearch(page, "zzz");
    await expect(page).toHaveURL(/q=zzz/);
    await expect(page.getByText("No items match", { exact: true })).toBeVisible();
    await expect(productList(page)).toHaveCount(0);
  });

  test("sort lives in ?sort= and keeps the search, and the search keeps the sort", async ({ page }) => {
    await page.goto("/shop");
    await sortSelect(page).selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(productNames(page)).toHaveText([
      "Gel pen",
      "Field notebook",
      "Slip case",
      "Maple lamp",
      "Cedar stool",
    ]);

    await typeSearch(page, "s");
    await expect(page).toHaveURL(/q=s/);
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(productNames(page)).toHaveText(["Slip case", "Cedar stool"]);

    await sortSelect(page).selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect(page).toHaveURL(/q=s/);
    await expect(productNames(page)).toHaveText(["Cedar stool", "Slip case"]);
  });

  test("an unknown sort falls back to name order", async ({ page }) => {
    await page.goto("/shop?sort=cheapest");
    await expect(sortSelect(page)).toHaveValue("name");
    await expect(productNames(page)).toHaveText(ALL_BY_NAME);
  });

  test("one search edit makes one history entry, not one per keystroke", async ({ page }) => {
    await page.goto("/shop");
    await typeSearch(page, "la");
    await expect(page).toHaveURL(/q=la$/);
    await searchBox(page).pressSequentially("mp");
    await expect(page).toHaveURL(/q=lamp$/);

    await page.goBack();
    await expect(page).not.toHaveURL(/q=/);
    await expect(productList(page).getByRole("listitem")).toHaveCount(5);
  });

  test("Back and Forward move between sort choices and update the select", async ({ page }) => {
    await page.goto("/shop");
    await sortSelect(page).selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await sortSelect(page).selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);

    await page.goBack();
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(sortSelect(page)).toHaveValue("price-asc");
    await expect(productNames(page).first()).toHaveText("Gel pen");

    await page.goForward();
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect(sortSelect(page)).toHaveValue("price-desc");
    await expect(productNames(page).first()).toHaveText("Cedar stool");
  });

  test("searching and sorting never call the JSON API", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url());
    });
    await page.goto("/shop");
    await typeSearch(page, "lamp");
    await expect(productNames(page)).toHaveText(["Maple lamp"]);
    await sortSelect(page).selectOption("price-desc");
    await expect(page).toHaveURL(/sort=price-desc/);
    expect(apiCalls).toEqual([]);
  });

  test("the server renders the filtered list for a direct URL (no JavaScript needed)", async ({ request }) => {
    const html = await (await request.get("/shop?q=sto&sort=price-desc")).text();
    expect(html).toContain("Cedar stool");
    expect(html).not.toContain("Maple lamp");
    expect(html).toContain('value="sto"');
  });
});
