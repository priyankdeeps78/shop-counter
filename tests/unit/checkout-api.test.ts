import { describe, expect, it } from "vitest";
import { post } from "./route-fetch";

describe("POST /api/checkout/begin", () => {
  it("prices lines from the catalogue and ignores the client's unit price", async () => {
    const res = await post("/api/checkout/begin", {
      lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }],
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      attemptId: expect.any(String),
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });
  });

  it.each([
    ["an empty cart", { lines: [] }],
    ["an unknown sku", { lines: [{ sku: "teapot", qty: 1 }] }],
    ["a qty below 1", { lines: [{ sku: "pen", qty: 0 }] }],
    ["a fractional qty", { lines: [{ sku: "pen", qty: 1.5 }] }],
    ["no lines at all", {}],
  ])("rejects %s", async (_label, body) => {
    const res = await post("/api/checkout/begin", body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_cart" });
  });
});

describe("POST /api/checkout/complete", () => {
  it("builds the order from the stored snapshot and is idempotent", async () => {
    const attempt = await (
      await post("/api/checkout/begin", { lines: [{ sku: "notebook", qty: 1 }] })
    ).json();

    const first = await post("/api/checkout/complete", {
      attemptId: attempt.attemptId,
      lines: [{ sku: "case", qty: 10 }],
      amountCents: 1,
    });
    expect(first.status).toBe(200);
    const order = await first.json();
    expect(order).toEqual({
      orderId: expect.any(String),
      attemptId: attempt.attemptId,
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });

    const again = await (await post("/api/checkout/complete", { attemptId: attempt.attemptId })).json();
    expect(again).toEqual(order);
  });

  it("answers 404 for an unknown attempt", async () => {
    const res = await post("/api/checkout/complete", { attemptId: "nope" });
    expect(res.status).toBe(404);
  });
});
