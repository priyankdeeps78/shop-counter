import { describe, expect, it } from "vitest";
import { attemptToJson, beginCheckout } from "@/server/checkout";
import { createStore } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const ids = () => {
  let n = 0;
  return () => `attempt-${++n}`;
};

describe("beginCheckout — pricing", () => {
  it("ignores the client's unitPriceCents and charges the catalogue price (brief example)", () => {
    const store = createStore();
    const outcome = beginCheckout({ lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }] }, store, ids());
    expect(outcome.ok && attemptToJson(outcome.attempt)).toStrictEqual({
      attemptId: "attempt-1",
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });
  });

  it("prices several lines and adds them up, keeping the cart's order", () => {
    const outcome = beginCheckout(
      { lines: [{ sku: "case", qty: 1 }, { sku: "notebook", qty: 2, unitPriceCents: 0 }, { sku: "pen", qty: 3 }] },
      createStore(),
      ids(),
    );
    expect(outcome.ok && attemptToJson(outcome.attempt)).toStrictEqual({
      attemptId: "attempt-1",
      lines: [
        { sku: "case", name: "Slip case", unitPriceCents: 2200, qty: 1 },
        { sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 2 },
        { sku: "pen", name: "Gel pen", unitPriceCents: 400, qty: 3 },
      ],
      amountCents: 2200 + 3000 + 1200,
    });
  });

  it("drops any other client-sent money or names", () => {
    const outcome = beginCheckout(
      { lines: [{ sku: "pen", qty: 1, name: "Gold pen", totalCents: 0 }], amountCents: 1 },
      createStore(),
      ids(),
    );
    expect(outcome.ok && attemptToJson(outcome.attempt)).toMatchObject({
      lines: [{ sku: "pen", name: "Gel pen", unitPriceCents: 400, qty: 1 }],
      amountCents: 400,
    });
  });

  it("gives each attempt a new id (UUIDs by default)", () => {
    const store = createStore();
    const cart = { lines: [{ sku: "pen", qty: 1 }] };
    const first = beginCheckout(cart, store);
    const second = beginCheckout(cart, store);
    if (!first.ok || !second.ok) throw new Error("expected two attempts");
    expect(first.attempt.attemptId).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.attempt.attemptId).not.toBe(second.attempt.attemptId);
    expect(store.attemptsById.size).toBe(2);
  });
});

describe("beginCheckout — the stored snapshot cannot change", () => {
  it("stores the attempt frozen, lines and all", () => {
    const store = createStore();
    beginCheckout({ lines: [{ sku: "notebook", qty: 1 }] }, store, ids());
    const stored = store.attemptsById.get("attempt-1")!;
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.lines)).toBe(true);
    expect(Object.isFrozen(stored.lines[0])).toBe(true);
  });

  it("is independent of the request object, the response, and later price changes", () => {
    const store = createStore();
    const request = { lines: [{ sku: "notebook", qty: 1 }] };
    const outcome = beginCheckout(request, store, ids());
    if (!outcome.ok) throw new Error("expected an attempt");

    request.lines[0].qty = 99;
    request.lines.push({ sku: "pen", qty: 1 });
    const response = attemptToJson(outcome.attempt);
    response.lines[0].unitPriceCents = 1;
    response.amountCents = 1;
    store.products.get("notebook")!.priceCents = 9999;

    expect(attemptToJson(store.attemptsById.get("attempt-1")!)).toStrictEqual({
      attemptId: "attempt-1",
      lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
      amountCents: 1500,
    });
  });

  it("changes nothing else: no stock, payments, orders, or catalogue reads", () => {
    const store = createStore();
    const before = snapshotStore(store);
    beginCheckout({ lines: [{ sku: "case", qty: 2 }] }, store, ids());
    const after = snapshotStore(store);
    expect(after.attemptsById).toHaveLength(1);
    expect({ ...after, attemptsById: [] }).toStrictEqual({ ...before, attemptsById: [] });
  });
});

describe("beginCheckout — invalid carts", () => {
  it.each([
    ["an empty lines array", { lines: [] }],
    ["no lines", {}],
    ["lines that are not an array", { lines: { sku: "pen", qty: 1 } }],
    ["an unknown sku", { lines: [{ sku: "chair", qty: 1 }] }],
    ["a desk-only item (lamp)", { lines: [{ sku: "lamp", qty: 1 }] }],
    ["an upper-case sku", { lines: [{ sku: "PEN", qty: 1 }] }],
    ["qty 0", { lines: [{ sku: "pen", qty: 0 }] }],
    ["a negative qty", { lines: [{ sku: "pen", qty: -1 }] }],
    ["a fractional qty", { lines: [{ sku: "pen", qty: 1.5 }] }],
    ["qty as a string", { lines: [{ sku: "pen", qty: "1" }] }],
    ["a missing qty", { lines: [{ sku: "pen" }] }],
    ["an unsafe integer qty", { lines: [{ sku: "pen", qty: Number.MAX_SAFE_INTEGER + 2 }] }],
    ["an infinite qty (JSON 1e400)", { lines: [{ sku: "pen", qty: Infinity }] }],
    ["the same sku twice", { lines: [{ sku: "pen", qty: 1 }, { sku: "pen", qty: 2 }] }],
    ["one bad line among good ones", { lines: [{ sku: "pen", qty: 1 }, { sku: "case", qty: 0 }] }],
    ["a line that is not an object", { lines: ["pen"] }],
    ["a total too large to be exact", { lines: [{ sku: "case", qty: Number.MAX_SAFE_INTEGER }] }],
    ["a null body", null],
    ["an array body", [{ sku: "pen", qty: 1 }]],
    ["a string body", "pen"],
  ])("rejects %s and stores nothing", (_label, input) => {
    const store = createStore();
    const before = snapshotStore(store);
    expect(beginCheckout(input, store, ids())).toStrictEqual({ ok: false });
    expect(snapshotStore(store)).toStrictEqual(before);
  });
});
