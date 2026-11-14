import { expect, test } from "@playwright/test";

// Runs against the production server. Other specs may record payments first, so
// limited stock is checked as "at most the seeded amount" rather than exact.
test("GET /api/catalog returns the live catalogue array", async ({ request }) => {
  const response = await request.get("/api/catalog");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");

  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body).toHaveLength(5);
  expect(body.map((item: { sku: string }) => item.sku)).toEqual([
    "lamp",
    "stool",
    "notebook",
    "pen",
    "case",
  ]);
  for (const item of body) {
    expect(Object.keys(item).sort()).toEqual(["extras", "name", "priceCents", "remaining", "sku"]);
  }
  expect(body[0]).toMatchObject({ name: "Maple lamp", priceCents: 8000, extras: [] });
  expect(body[0].remaining).toBeLessThanOrEqual(5);
  expect(body[1]).toMatchObject({
    name: "Cedar stool",
    priceCents: 12000,
    extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
  });
  expect(body[1].remaining).toBeLessThanOrEqual(2);
  expect(body.slice(2)).toStrictEqual([
    { sku: "notebook", name: "Field notebook", priceCents: 1500, remaining: null, extras: [] },
    { sku: "pen", name: "Gel pen", priceCents: 400, remaining: null, extras: [] },
    { sku: "case", name: "Slip case", priceCents: 2200, remaining: null, extras: [] },
  ]);
});
