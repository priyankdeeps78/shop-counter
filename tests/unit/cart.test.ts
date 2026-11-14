import { describe, expect, it } from "vitest";
import { cartReducer, cartTotalCents, matchesSnapshot, type Cart } from "@/features/checkout/lib/cart";

const PRICES = { notebook: 1500, pen: 400, case: 2200 };

describe("cartReducer", () => {
  it("adds once, increases, decreases to 0 (removing the line), and removes", () => {
    let cart: Cart = [];
    cart = cartReducer(cart, { type: "add", sku: "notebook" });
    cart = cartReducer(cart, { type: "add", sku: "notebook" }); // already in the cart: no change
    cart = cartReducer(cart, { type: "add", sku: "pen" });
    cart = cartReducer(cart, { type: "increase", sku: "pen" });
    expect(cart).toEqual([{ sku: "notebook", qty: 1 }, { sku: "pen", qty: 2 }]);

    cart = cartReducer(cart, { type: "decrease", sku: "pen" });
    cart = cartReducer(cart, { type: "decrease", sku: "notebook" });
    expect(cart).toEqual([{ sku: "pen", qty: 1 }]);

    expect(cartReducer(cart, { type: "remove", sku: "pen" })).toEqual([]);
    expect(cartReducer(cart, { type: "clear" })).toEqual([]);
  });
});

describe("cartTotalCents", () => {
  it("is the unit price times quantity, added up", () => {
    expect(cartTotalCents([], PRICES)).toBe(0);
    expect(cartTotalCents([{ sku: "notebook", qty: 1 }, { sku: "pen", qty: 1 }], PRICES)).toBe(1900);
    expect(cartTotalCents([{ sku: "case", qty: 3 }], PRICES)).toBe(6600);
  });
});

describe("matchesSnapshot", () => {
  const snapshot = [{ sku: "notebook" as const, qty: 1 }];
  it("compares sku + quantity pairs, not totals and not order", () => {
    expect(matchesSnapshot([{ sku: "notebook", qty: 1 }], snapshot)).toBe(true);
    expect(matchesSnapshot([{ sku: "notebook", qty: 1 }, { sku: "pen", qty: 1 }], snapshot)).toBe(false);
    expect(matchesSnapshot([{ sku: "notebook", qty: 2 }], snapshot)).toBe(false);
    expect(matchesSnapshot([], snapshot)).toBe(false);
    // Same total ($8), different lines: still a change.
    expect(matchesSnapshot([{ sku: "pen", qty: 2 }], [{ sku: "pen", qty: 1 }, { sku: "pen", qty: 1 }])).toBe(false);
    expect(
      matchesSnapshot([{ sku: "pen", qty: 1 }, { sku: "case", qty: 1 }], [{ sku: "case", qty: 1 }, { sku: "pen", qty: 1 }]),
    ).toBe(true);
  });
});
