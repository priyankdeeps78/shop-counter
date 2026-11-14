import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";
import { ProductImage } from "./product-image";

export function ProductDetails({ product }: { product: Product }) {
  return (
    <article aria-labelledby="product-heading" className="product-detail enter">
      <ProductImage sku={product.sku} className="detail-media" />
      <div className="detail-info">
        <h1 id="product-heading" className="display page-title">
          {product.name}
        </h1>

        <dl className="detail-facts">
          <dt>Price</dt>
          <dd>{formatMoney(product.priceCents)}</dd>
          <dt>Stock</dt>
          <dd>{formatRemaining(product.remaining)}</dd>
        </dl>

        <section aria-labelledby="extras-heading" className="detail-extras">
          <h2 id="extras-heading" className="display panel-title">Extras</h2>
          {product.extras.length === 0 ? (
            <p className="text-muted">No extras</p>
          ) : (
            <ul>
              {product.extras.map((extra) => (
                <li key={extra.code}>{extra.name}: {formatMoney(extra.priceCents)}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
