import { expect, test } from "@playwright/test";

const PRODUCTS = [
  { sku: "lamp", name: "Maple lamp", price: "$80", stock: /^\d+ left$/, extras: [] },
  { sku: "stool", name: "Cedar stool", price: "$120", stock: /^\d+ left$/, extras: ["Cushion: $25"] },
  { sku: "notebook", name: "Field notebook", price: "$15", stock: /^Not stock-limited$/, extras: [] },
  { sku: "pen", name: "Gel pen", price: "$4", stock: /^Not stock-limited$/, extras: [] },
  { sku: "case", name: "Slip case", price: "$22", stock: /^Not stock-limited$/, extras: [] },
];

test.describe("/shop/<sku>", () => {
  for (const product of PRODUCTS) {
    test(`${product.sku}: title, description, name, price, stock, extras`, async ({ page }) => {
      const response = await page.goto(`/shop/${product.sku}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${product.name} | Shop counter`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        new RegExp(`^${product.name} for \\${product.price} `),
      );

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(product.name);
      const details = page.getByRole("article", { name: product.name });
      await expect(details.getByText("Price").locator("+ dd")).toHaveText(product.price);
      await expect(details.getByText("Stock").locator("+ dd")).toHaveText(product.stock);
      const extras = details.getByRole("region", { name: "Extras" });
      if (product.extras.length === 0) {
        await expect(extras.getByText("No extras")).toBeVisible();
      } else {
        await expect(extras.getByRole("listitem")).toHaveText(product.extras);
      }
    });
  }

  test("the title and description are in the server HTML <head>", async ({ request }) => {
    const html = await (await request.get("/shop/stool")).text();
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain("<title>Cedar stool | Shop counter</title>");
    expect(head).toContain(
      '<meta name="description" content="Cedar stool for $120 at Shop counter. Optional extra: Cushion ($25)."/>',
    );
  });

  test("an unknown sku answers HTTP 404 (GET and HEAD)", async ({ request }) => {
    for (const path of ["/shop/not-a-sku", "/shop/zzz"]) {
      expect((await request.get(path)).status()).toBe(404);
      expect((await request.head(path)).status()).toBe(404);
    }
  });

  test("sku matching is exact: case variants, padding, and bad encoding are 404", async ({ request }) => {
    for (const path of ["/shop/LAMP", "/shop/Pen", "/shop/lamp%20", "/shop/%E0%A4%A"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("the 404 body is the server-rendered not-found page, not an empty error shell", async ({ request }) => {
    const html = await (await request.get("/shop/not-a-sku")).text();
    expect(html).not.toContain("__next_error__");
    expect(html).toContain("<title>Page not found | Shop counter</title>");
    expect(html).toMatch(/<h1[^>]*>Page not found<\/h1>/);
    expect(html).toContain('<meta name="robots" content="noindex"/>');
  });

  test("an unknown sku shows the not-found page in the browser, titled and not indexed", async ({ page }) => {
    const response = await page.goto("/shop/not-a-sku");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page).toHaveTitle("Page not found | Shop counter");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await page.getByRole("link", { name: "Back to the shop" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });

  test("the shop links to each item page and the item page links back", async ({ page }) => {
    await page.goto("/shop");
    await page.getByRole("link", { name: "Cedar stool" }).click();
    await expect(page).toHaveURL(/\/shop\/stool$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cedar stool");
    await expect(page).toHaveTitle("Cedar stool | Shop counter");
    await page.getByRole("link", { name: "Back to the shop" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});
