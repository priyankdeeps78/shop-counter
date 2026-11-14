import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { CatalogueLoading } from "@/components/loading";
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
    <section aria-labelledby="page-heading" className="shop-page">
      <div className="shop-hero">
        <picture className="hero-media">
          <source media="(max-width: 42rem)" srcSet="/shop-images/everyday-mobile.webp" />
          <Image src="/shop-images/collection.webp" alt="" fill unoptimized loading="eager" fetchPriority="high" />
        </picture>
        <div className="hero-copy enter">
          <h1 id="page-heading" className="hero-title">
            Good things<br />{" "}for every day<span className="hero-period">.</span>
          </h1>
          <p className="hero-description">Warm light, solid wood, and stationery worth keeping close.</p>
          <a href="#collection" className="button hero-link">
            Browse the collection <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
      <section id="collection" tabIndex={-1} aria-labelledby="collection-heading" className="collection-section">
        <header className="collection-heading">
          <h2 id="collection-heading" className="section-title">The collection</h2>
        </header>
        <Suspense fallback={<CatalogueLoading />}>
          <ShopResults searchParams={searchParams} />
        </Suspense>
      </section>
    </section>
  );
}
