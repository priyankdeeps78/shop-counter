import { expect, test } from "@playwright/test";

test("/ redirects to /shop", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1, name: "Good things for every day." })).toBeVisible();
});

for (const { path, heading, navLabel } of [
  { path: "/shop", heading: "Good things for every day.", navLabel: "Shop" },
  { path: "/desk", heading: "Desk", navLabel: "Desk" },
  { path: "/checkout", heading: "Checkout", navLabel: "Checkout" },
]) {
  test(`${path} renders with navigation`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: navLabel, exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
}

test("an unknown route answers 404 with the not-found page", async ({ request, page }) => {
  const response = await request.get("/no-such-page");
  expect(response.status()).toBe(404);
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page).toHaveTitle("Page not found | Shop counter");
});
