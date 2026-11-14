import { expect, test } from "@playwright/test";

test("/ redirects to /shop", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("heading", { level: 1, name: "Shop" })).toBeVisible();
});

for (const { path, heading } of [
  { path: "/shop", heading: "Shop" },
  { path: "/desk", heading: "Desk" },
  { path: "/checkout", heading: "Checkout" },
]) {
  test(`${path} renders with navigation`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(page.getByRole("link", { name: heading, exact: true })).toHaveAttribute(
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
});
