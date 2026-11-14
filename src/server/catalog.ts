import "server-only";
import { getStore, type Store } from "@/server/store";
import type { Product } from "@/types/domain";

/** Copies only the contract fields, so callers never hold references into the store. */
function toCatalogItem(product: Product): Product {
  return {
    sku: product.sku,
    name: product.name,
    priceCents: product.priceCents,
    remaining: product.remaining,
    extras: product.extras.map(({ code, name, priceCents }) => ({
      code,
      name,
      priceCents,
    })),
  };
}

/**
 * The current catalogue, read straight from the store on every call.
 * Not cached and not counted in `catalogReads` (only `getCatalog()` counts).
 */
export function getLiveCatalog(store: Store = getStore()): Product[] {
  return Array.from(store.products.values(), toCatalogItem);
}

/** How many times the cached `getCatalog()` body has actually run in this process. */
export function getCatalogReadCount(store: Store = getStore()): number {
  return store.catalogReads;
}
