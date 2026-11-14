import { beforeEach, describe, expect, it } from "vitest";
import * as beginRoute from "@/app/api/checkout/begin/route";
import { getStore, resetStore } from "@/server/store";

const post = (body: string | undefined) =>
  beginRoute.POST(
    new Request("http://localhost/api/checkout/begin", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    }),
  );

beforeEach(() => {
  resetStore();
});

describe("POST /api/checkout/begin", () => {
  it("answers the brief's example with the server price and stores the attempt", async () => {
    const response = await post(JSON.stringify({ lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toStrictEqual({
      attemptId: expect.any(String),
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });
    expect(Object.keys(body)).toEqual(["attemptId", "lines", "amountCents"]);
    expect(getStore().attemptsById.get(body.attemptId)).toMatchObject({ amountCents: 1500 });
  });

  it.each([
    ["an empty lines array", JSON.stringify({ lines: [] })],
    ["an unknown sku", JSON.stringify({ lines: [{ sku: "chair", qty: 1 }] })],
    ["qty below 1", JSON.stringify({ lines: [{ sku: "pen", qty: 0 }] })],
    ["broken JSON", "{"],
    ["an empty body", undefined],
    ["a JSON qty of 1e400", '{"lines":[{"sku":"pen","qty":1e400}]}'],
  ])("answers 400 { error: 'invalid_cart' } for %s", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "invalid_cart" });
    expect(getStore().attemptsById.size).toBe(0);
  });

  it("exposes only POST", () => {
    expect(Object.keys(beginRoute)).toEqual(["POST"]);
  });
});
