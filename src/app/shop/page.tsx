import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { CatalogueFiltersLoading, CatalogueLoading } from "@/components/loading";
import { CatalogList } from "@/features/catalog/components/catalog-list";
import { ShopFilters } from "@/features/catalog/components/shop-filters";
import { filterAndSortCatalog, parseShopQuery, type ShopQuery } from "@/features/catalog/lib/filter-catalog";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the catalogue: lamps, stools, notebooks, pens, and cases.",
};

async function ShopResults({ query }: { query: ShopQuery }) {
  return <CatalogList products={filterAndSortCatalog(await getCatalog(), query)} />;
}

/** Resolve the URL before rendering the filters so only the results wait for the catalogue. */
async function ShopCatalogue({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const query = parseShopQuery(await searchParams);

  return (
    <ShopFilters q={query.q} sort={query.sort}>
      <Suspense fallback={<CatalogueLoading />}>
        <ShopResults query={query} />
      </Suspense>
    </ShopFilters>
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
        <Suspense
          fallback={
            <>
              <CatalogueFiltersLoading />
              <CatalogueLoading />
            </>
          }
        >
          <ShopCatalogue searchParams={searchParams} />
        </Suspense>
      </section>
    </section>
  );
}
