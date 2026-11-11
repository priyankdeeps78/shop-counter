import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemArt } from "@/components/item-art";
import { StockBadge } from "@/components/stock-badge";
import { getCatalog } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { stockLabel } from "@/lib/shop-query";

/**
 * Every part of this page comes from the cached catalogue and the sku, so
 * the whole page can be static. `'navigation'` makes the build fail if
 * request-time work sneaks in, and makes a request for an sku that was not
 * prerendered wait for the full render instead of streaming a shell first.
 * That wait is what lets an unknown sku answer a real HTTP 404: `notFound()`
 * runs before any byte of the response is sent.
 */
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((item) => ({ sku: item.sku }));
}

async function findItem(sku: string) {
  const catalog = await getCatalog();
  return catalog.find((item) => item.sku === sku);
}

export async function generateMetadata({ params }: PageProps<"/shop/[sku]">): Promise<Metadata> {
  const { sku } = await params;
  const item = await findItem(sku);
  if (!item) return { title: "Not found" };

  const extras = item.extras.map((e) => `${e.name} ${formatCents(e.priceCents)}`).join(", ");
  return {
    title: item.name,
    description: `${item.name}, ${formatCents(item.priceCents)}. ${stockLabel(item.remaining)}.${
      extras ? ` Extras: ${extras}.` : ""
    }`,
  };
}

export default async function ItemPage({ params }: PageProps<"/shop/[sku]">) {
  const { sku } = await params;
  const item = await findItem(sku);
  if (!item) notFound();

  return (
    <article>
      <p>
        <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss hover:text-moss-dark">
          <span aria-hidden="true">←</span> Back to the shop
        </Link>
      </p>
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
        <ItemArt sku={item.sku} className="card aspect-square" />
        <div className="md:pt-6">
          <p className="eyebrow">{item.remaining === null ? "Always in stock" : "Limited run"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{item.name}</h1>
          <p className="mt-4 font-display text-3xl tabular-nums">
            <span className="sr-only">Price </span>
            {formatCents(item.priceCents)}
          </p>

          <dl className="card mt-8 divide-y divide-line">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <dt className="font-semibold">Remaining</dt>
              <dd>
                <StockBadge remaining={item.remaining} />
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 px-5 py-4">
              <dt className="font-semibold">Extras</dt>
              <dd className="text-right">
                {item.extras.length === 0 ? (
                  <span className="text-muted">None</span>
                ) : (
                  <ul className="flex flex-wrap justify-end gap-2">
                    {item.extras.map((extra) => (
                      <li key={extra.code} className="pill bg-clay-soft text-clay">
                        {extra.name} {formatCents(extra.priceCents)}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>

          {item.remaining !== null && (
            <p className="mt-4 text-sm text-muted">
              Lamps and stools are sold at the counter. Staff record the payment at the desk.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
