import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";

export function ProductDetails({ product }: { product: Product }) {
  return (
    <article aria-labelledby="product-heading" className="space-y-6">
      <h1 id="product-heading" className="text-2xl font-semibold">
        {product.name}
      </h1>

      <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted">Price</dt>
        <dd className="font-medium">{formatMoney(product.priceCents)}</dd>
        <dt className="text-muted">Stock</dt>
        <dd>{formatRemaining(product.remaining)}</dd>
      </dl>

      <section aria-labelledby="extras-heading" className="space-y-2">
        <h2 id="extras-heading" className="text-lg font-semibold">
          Extras
        </h2>
        {product.extras.length === 0 ? (
          <p className="text-muted">No extras</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {product.extras.map((extra) => (
              <li key={extra.code}>
                {extra.name}: {formatMoney(extra.priceCents)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
