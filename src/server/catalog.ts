import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { getStore, type Store } from "@/server/store";
import type { Product } from "@/types/domain";

/** Cache tag on every cached catalogue read; expiring it refreshes the shop pages. */
export const CATALOG_TAG = "catalog";

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
 * Used by `GET /api/catalog` and by server-side pricing and stock checks.
 */
export function getLiveCatalog(store: Store = getStore()): Product[] {
  return Array.from(store.products.values(), toCatalogItem);
}

/** How many times the `getCatalog()` body has actually run in this process. */
export function getCatalogReadCount(store: Store = getStore()): number {
  return store.catalogReads;
}

/**
 * The one cached catalogue reader shared by the shop pages.
 *
 * The body runs only on a cache miss: the first read in this process, or the
 * first read after `expireCatalogCache()`. Cache hits return the stored result
 * without running it, so `catalogReads` counts real executions only.
 */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("catalog");

  const store = getStore();
  store.catalogReads += 1;
  return getLiveCatalog(store);
}

/**
 * Expires every cache entry tagged `catalog`, including prerendered shop pages.
 * `{ expire: 0 }` means no stale copy is ever served: the next request blocks
 * on a fresh `getCatalog()` run. Call after a stock-changing write, from a
 * Route Handler (`updateTag` is only for Server Actions).
 */
export function expireCatalogCache(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
