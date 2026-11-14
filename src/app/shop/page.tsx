import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogList } from "@/features/catalog/components/catalog-list";
import { ShopFilters } from "@/features/catalog/components/shop-filters";
import { filterAndSortCatalog, parseShopQuery } from "@/features/catalog/lib/filter-catalog";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the catalogue: lamps, stools, notebooks, pens, and cases.",
};

/**
 * Reads the URL, so it renders per request. It sits inside <Suspense> so the
 * heading stays in the prerendered shell. The catalogue itself comes from the
 * cached `getCatalog()`; `q` and `sort` are applied after the cached read, so
 * every URL shares one cache entry.
 */
async function ShopResults({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const query = parseShopQuery(await searchParams);
  const products = filterAndSortCatalog(await getCatalog(), query);

  return (
    <>
      <ShopFilters q={query.q} sort={query.sort} />
      <CatalogList products={products} />
    </>
  );
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <section aria-labelledby="page-heading" className="space-y-6">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Shop
      </h1>
      <Suspense fallback={<p className="text-sm text-muted">Loading the catalogue…</p>}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
