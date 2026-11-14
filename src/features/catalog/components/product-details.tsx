import Link from "next/link";
import { isCheckoutSku } from "@/types/domain";
import { PRODUCT_PRESENTATION } from "@/features/catalog/lib/product-presentation";
import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";
import { ProductImage } from "./product-image";

export function ProductDetails({ product }: { product: Product }) {
  const { category, description } = PRODUCT_PRESENTATION[product.sku];
  const isCheckoutItem = isCheckoutSku(product.sku);

  return (
    <article aria-labelledby="product-heading" className="product-detail enter">
      <ProductImage sku={product.sku} className="detail-media" eager />

      <div className="detail-info">
        <header className="detail-intro">
          <p className="product-category">{category}</p>
          <h1 id="product-heading" className="detail-title">{product.name}</h1>
          <p className="detail-description">{description}</p>
        </header>

        <div className="detail-purchase">
          <dl className="detail-facts">
            <div>
              <dt>Price</dt>
              <dd className="detail-price">{formatMoney(product.priceCents)}</dd>
            </div>
            <div>
              <dt>Stock</dt>
              <dd className="stock-note" data-sold-out={product.remaining === 0}>
                {formatRemaining(product.remaining)}
              </dd>
            </div>
          </dl>
          {isCheckoutItem ? (
            <Link href="/checkout" className="button button-primary detail-action">
              Go to checkout <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className="detail-purchase-note">This item is sold through the staff desk.</p>
          )}
        </div>

        <section aria-labelledby="extras-heading" className="detail-extras">
          <h2 id="extras-heading">Extras</h2>
          {product.extras.length === 0 ? (
            <p>No extras</p>
          ) : (
            <ul>
              {product.extras.map((extra) => (
                <li key={extra.code}>
                  <span>{extra.name}: </span><strong>{formatMoney(extra.priceCents)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
