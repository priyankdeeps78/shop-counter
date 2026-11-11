import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ItemArt } from "@/components/item-art";
import { PageHeader } from "@/components/page-header";
import { StockBadge } from "@/components/stock-badge";
import { getCatalog } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { filterAndSort, parseShopQuery } from "@/lib/shop-query";
import { ShopControls } from "./shop-controls";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse lamps, stools and stationery, with live stock counts.",
};

/**
 * The heading is part of the static shell. Everything that depends on `?q=`
 * and `?sort=` sits behind <Suspense>, because reading searchParams on the
 * server is request-time work. The data inside it still comes from the cached
 * `getCatalog()`, so a request renders the filter but does not re-read stock.
 */
export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHeader eyebrow="The catalogue" title="Shop">
        Hand-finished furniture and the stationery to go with it.
      </PageHeader>
      <Suspense fallback={<ResultsSkeleton />}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ShopResults({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const query = parseShopQuery(await searchParams);
  const items = filterAndSort(await getCatalog(), query);

  return (
    <>
      <ShopControls q={query.q} sort={query.sort} />
      <section aria-labelledby="results-heading" className="mt-8">
        <h2 id="results-heading" className="sr-only">
          Items
        </h2>
        <p role="status" className="mb-4 text-sm text-muted">
          {items.length === 1 ? "1 item" : `${items.length} items`}
          {query.q ? ` matching “${query.q}”` : ""}
        </p>
        {items.length === 0 ? (
          <div className="card px-6 py-14 text-center">
            <p className="font-display text-2xl">No items match</p>
            <p className="mt-2 text-muted">Try a shorter word, or clear the search.</p>
            <Link href="/shop" className="btn-secondary mt-6">
              Show everything
            </Link>
          </div>
        ) : (
          <ul aria-label="Items" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.sku}
                className="card group relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-moss has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-paper"
              >
                <ItemArt sku={item.sku} className="aspect-[4/3] transition duration-300 group-hover:scale-[1.03]" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/shop/${item.sku}`}
                      className="font-display text-xl font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                    >
                      {item.name}
                    </Link>
                    <span className="text-lg font-semibold tabular-nums">{formatCents(item.priceCents)}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <StockBadge remaining={item.remaining} />
                    {item.extras.length > 0 && (
                      <span className="text-xs text-muted">+ {item.extras.map((e) => e.name).join(", ")}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <p className="sr-only">Loading items…</p>
      <div className="h-[74px] animate-pulse rounded-2xl bg-line/50" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/4] animate-pulse rounded-2xl bg-line/50" />
        ))}
      </div>
    </div>
  );
}
