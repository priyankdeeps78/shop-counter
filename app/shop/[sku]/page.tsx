import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
        <Link href="/shop" className="underline underline-offset-4">
          Back to the shop
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold">{item.name}</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
        <dt className="font-medium">Price</dt>
        <dd>{formatCents(item.priceCents)}</dd>
        <dt className="font-medium">Remaining</dt>
        <dd>{stockLabel(item.remaining)}</dd>
        <dt className="font-medium">Extras</dt>
        <dd>
          {item.extras.length === 0 ? (
            "None"
          ) : (
            <ul>
              {item.extras.map((extra) => (
                <li key={extra.code}>
                  {extra.name} {formatCents(extra.priceCents)}
                </li>
              ))}
            </ul>
          )}
        </dd>
      </dl>
    </article>
  );
}
