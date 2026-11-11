import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { countCatalogRead, readCatalog } from "./store";
import type { CatalogItem } from "./types";

export const CATALOG_TAG = "catalog";

/**
 * The only way pages read the catalogue.
 *
 * `use cache` stores the result in Next's server cache under the `catalog`
 * tag. The body (and so the read counter) only runs on a cache miss: the
 * first request, or the first request after `invalidateCatalog()`.
 *
 * `cacheLife("max")` means no time-based refresh worth speaking of (30 days).
 * Stock only changes through `POST /api/payments`, and that route invalidates
 * the tag itself, so a timer would only re-read data we already know is fresh.
 */
export async function getCatalog(): Promise<CatalogItem[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");
  countCatalogRead();
  return readCatalog();
}

/**
 * Expire the cached catalogue now. `{ expire: 0 }` makes the next request
 * wait for a fresh read instead of being served the old stock while it
 * revalidates in the background (which is what the recommended "max"
 * profile would do).
 */
export function invalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
