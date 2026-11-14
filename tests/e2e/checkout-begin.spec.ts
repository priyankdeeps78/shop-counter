import { expect, test } from "@playwright/test";
import { catalogReads, liveStock } from "./support/api";

// Production server. Checkout items are not stock-limited, so these tests can
// run any number of times without touching the shared lamp/stool budget.
test.describe("POST /api/checkout/begin", () => {
  test("prices from the catalogue, ignoring a tampered unitPriceCents", async ({ request }) => {
    const response = await request.post("/api/checkout/begin", {
      data: { lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }] },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toStrictEqual({
      attemptId: expect.any(String),
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });
  });

  test("sums several lines", async ({ request }) => {
    const response = await request.post("/api/checkout/begin", {
      data: { lines: [{ sku: "notebook", qty: 1 }, { sku: "pen", qty: 2 }, { sku: "case", qty: 1 }] },
    });
    expect((await response.json()).amountCents).toBe(1500 + 800 + 2200);
  });

  test("answers 400 invalid_cart for an unknown sku, qty below 1, an empty cart, or bad JSON", async ({ request }) => {
    for (const data of [
      { lines: [{ sku: "chair", qty: 1 }] },
      { lines: [{ sku: "pen", qty: 0 }] },
      { lines: [] },
    ]) {
      const response = await request.post("/api/checkout/begin", { data });
      expect(response.status()).toBe(400);
      expect(await response.json()).toStrictEqual({ error: "invalid_cart" });
    }
    const broken = await request.post("/api/checkout/begin", {
      data: "{",
      headers: { "content-type": "application/json" },
    });
    expect(broken.status()).toBe(400);
  });

  test("starting an attempt changes no stock and runs no catalogue read; GET is not allowed", async ({ request }) => {
    const lamp = await liveStock(request, "lamp");
    const reads = await catalogReads(request);
    await request.post("/api/checkout/begin", { data: { lines: [{ sku: "case", qty: 3 }] } });
    expect(await liveStock(request, "lamp")).toBe(lamp);
    expect(await catalogReads(request)).toBe(reads);
    expect((await request.get("/api/checkout/begin")).status()).toBe(405);
  });
});
