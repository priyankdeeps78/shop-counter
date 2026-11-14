import { expect, test } from "@playwright/test";

// Production server. Checkout items are not stock-limited: safe to repeat.
const NOTEBOOK_LINES = [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }];

test.describe("POST /api/checkout/complete", () => {
  test("worked example at the API: Pay for a notebook, then the order ignores a pen added later", async ({
    request,
  }) => {
    const attempt = await (
      await request.post("/api/checkout/begin", { data: { lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }] } })
    ).json();
    expect(attempt.amountCents).toBe(1500);

    const response = await request.post("/api/checkout/complete", {
      data: {
        attemptId: attempt.attemptId,
        lines: [
          { sku: "notebook", qty: 1 },
          { sku: "pen", qty: 1 },
        ],
        amountCents: 1900,
      },
    });
    expect(response.status()).toBe(200);
    const order = await response.json();
    expect(order).toStrictEqual({
      orderId: expect.any(String),
      attemptId: attempt.attemptId,
      lines: NOTEBOOK_LINES,
      amountCents: 1500,
    });

    // Completing the same attempt again: the same order and amount.
    const again = await request.post("/api/checkout/complete", { data: { attemptId: attempt.attemptId } });
    expect(again.status()).toBe(200);
    expect(await again.json()).toStrictEqual(order);
  });

  test("answers 404 for an unknown attempt and 400 without an attemptId; GET is not allowed", async ({ request }) => {
    const unknown = await request.post("/api/checkout/complete", { data: { attemptId: "no-such-attempt" } });
    expect(unknown.status()).toBe(404);
    expect(await unknown.json()).toStrictEqual({ error: "attempt_not_found" });

    const missing = await request.post("/api/checkout/complete", { data: { lines: [] } });
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toStrictEqual({ error: "invalid_attempt" });

    expect((await request.get("/api/checkout/complete")).status()).toBe(405);
  });
});
