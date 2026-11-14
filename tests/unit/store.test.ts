import { describe, expect, it } from "vitest";
import { createStore, getStore } from "@/server/store";
import { CHECKOUT_SKUS, DESK_SKUS, SKUS } from "@/types/domain";
import { INITIAL_CATALOG as EXPECTED_CATALOG } from "../support/catalog-contract";

describe("createStore", () => {
  it("seeds exactly the five catalogue products, in order, with exact fields", () => {
    const store = createStore();
    expect([...store.products.keys()]).toEqual(["lamp", "stool", "notebook", "pen", "case"]);
    expect([...store.products.values()]).toStrictEqual(EXPECTED_CATALOG);
  });

  it("limits stock only for the lamp (5) and stool (2)", () => {
    const store = createStore();
    expect(store.products.get("lamp")?.remaining).toBe(5);
    expect(store.products.get("stool")?.remaining).toBe(2);
    for (const sku of CHECKOUT_SKUS) {
      expect(store.products.get(sku)?.remaining).toBeNull();
    }
  });

  it("offers the Cushion extra only on the stool", () => {
    const store = createStore();
    for (const product of store.products.values()) {
      const expected = product.sku === "stool" ? ["cushion"] : [];
      expect(product.extras.map((extra) => extra.code)).toEqual(expected);
    }
  });

  it("starts with no payments, attempts, orders, or catalogue reads", () => {
    const store = createStore();
    expect(store.paymentsByChargeId.size).toBe(0);
    expect(store.paymentQueue).toEqual([]);
    expect(store.attemptsById.size).toBe(0);
    expect(store.ordersByAttemptId.size).toBe(0);
    expect(store.catalogReads).toBe(0);
  });

  it("gives each store its own state, so changing one never leaks into another", () => {
    const first = createStore();
    const stool = first.products.get("stool")!;
    stool.remaining = 0;
    stool.extras[0].priceCents = 1;
    first.catalogReads = 3;

    const second = createStore();
    expect(second.products.get("stool")?.remaining).toBe(2);
    expect(second.products.get("stool")?.extras[0].priceCents).toBe(2500);
    expect(second.catalogReads).toBe(0);
    expect([...second.products.values()]).toStrictEqual(EXPECTED_CATALOG);
  });
});

describe("getStore", () => {
  it("returns the same process-local store on every call", () => {
    expect(getStore()).toBe(getStore());
  });
});

describe("sku groups", () => {
  it("split the catalogue into desk items and checkout items", () => {
    expect(DESK_SKUS).toEqual(["lamp", "stool"]);
    expect(CHECKOUT_SKUS).toEqual(["notebook", "pen", "case"]);
    expect(SKUS).toEqual(EXPECTED_CATALOG.map((product) => product.sku));
  });
});
