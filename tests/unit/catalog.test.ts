import { describe, expect, it } from "vitest";
import { getCatalogReadCount, getLiveCatalog } from "@/server/catalog";
import { createStore } from "@/server/store";
import { INITIAL_CATALOG } from "../support/catalog-contract";

describe("getLiveCatalog", () => {
  it("returns all five products with exactly the contract fields", () => {
    expect(getLiveCatalog(createStore())).toStrictEqual(INITIAL_CATALOG);
  });

  it("reflects the store's current stock on every call", () => {
    const store = createStore();
    store.products.get("lamp")!.remaining = 4;
    expect(getLiveCatalog(store)[0]).toMatchObject({ sku: "lamp", remaining: 4 });
    store.products.get("lamp")!.remaining = 3;
    expect(getLiveCatalog(store)[0]).toMatchObject({ sku: "lamp", remaining: 3 });
  });

  it("returns copies, so editing the result never changes the store", () => {
    const store = createStore();
    const catalog = getLiveCatalog(store);
    catalog[0].remaining = 0;
    catalog[1].extras[0].priceCents = 1;
    catalog.pop();
    expect(getLiveCatalog(store)).toStrictEqual(INITIAL_CATALOG);
  });

  it("does not count as a catalogue read", () => {
    const store = createStore();
    getLiveCatalog(store);
    getLiveCatalog(store);
    expect(getCatalogReadCount(store)).toBe(0);
  });
});
