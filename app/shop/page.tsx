import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { filterAndSort, parseShopQuery, stockLabel } from "@/lib/shop-query";
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
      <h1 className="text-2xl font-semibold">Shop</h1>
      <Suspense fallback={<p className="mt-6">Loading items…</p>}>
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
      <section aria-labelledby="results-heading" className="mt-6">
        <h2 id="results-heading" className="sr-only">
          Items
        </h2>
        <p role="status" className="sr-only">
          {items.length === 1 ? "1 item" : `${items.length} items`}
        </p>
        {items.length === 0 ? (
          <p>No items match</p>
        ) : (
          <ul aria-label="Items" className="divide-y divide-stone-200 border-y border-stone-200">
            {items.map((item) => (
              <li key={item.sku} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <Link href={`/shop/${item.sku}`} className="font-medium underline underline-offset-4">
                  {item.name}
                </Link>
                <span className="flex gap-4 text-stone-700">
                  <span>{formatCents(item.priceCents)}</span>
                  <span>{stockLabel(item.remaining)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
