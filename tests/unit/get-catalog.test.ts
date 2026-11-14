import { beforeEach, describe, expect, it, vi } from "vitest";

// Outside Next.js, `'use cache'` is an inert string, so each call below runs the
// function body: these tests check what the body does on a cache miss and how it
// tags itself. Cross-request cache hits are checked on a production build.
const nextCache = vi.hoisted(() => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("next/cache", () => nextCache);

import { CATALOG_TAG, expireCatalogCache, getCatalog } from "@/server/catalog";
import { getStore, resetStore } from "@/server/store";
import { INITIAL_CATALOG } from "../support/catalog-contract";

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("getCatalog (cache-miss body)", () => {
  it("returns the catalogue with exactly the contract fields", async () => {
    expect(await getCatalog()).toStrictEqual(INITIAL_CATALOG);
  });

  it("tags its cache entry 'catalog' and uses the 'catalog' cache profile", async () => {
    await getCatalog();
    expect(nextCache.cacheTag).toHaveBeenCalledExactlyOnceWith(CATALOG_TAG);
    expect(CATALOG_TAG).toBe("catalog");
    expect(nextCache.cacheLife).toHaveBeenCalledExactlyOnceWith("catalog");
  });

  it("adds exactly 1 to catalogReads each time the body runs", async () => {
    await getCatalog();
    expect(getStore().catalogReads).toBe(1);
    await getCatalog();
    expect(getStore().catalogReads).toBe(2);
  });

  it("reads current stock from the store", async () => {
    getStore().products.get("lamp")!.remaining = 4;
    const catalog = await getCatalog();
    expect(catalog[0]).toMatchObject({ sku: "lamp", remaining: 4 });
  });

  it("returns copies, so a cached result can never be edited through the store", async () => {
    const catalog = await getCatalog();
    getStore().products.get("lamp")!.remaining = 0;
    expect(catalog[0].remaining).toBe(5);
  });
});

describe("expireCatalogCache", () => {
  it("expires the 'catalog' tag immediately, with no stale window", () => {
    expireCatalogCache();
    expect(nextCache.revalidateTag).toHaveBeenCalledExactlyOnceWith("catalog", { expire: 0 });
  });

  it("does not touch the store or the read counter", () => {
    expireCatalogCache();
    expect(getStore().catalogReads).toBe(0);
    expect(getStore().products.get("lamp")!.remaining).toBe(5);
  });
});
