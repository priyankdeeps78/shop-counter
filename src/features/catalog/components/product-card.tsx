import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";
import { PRODUCT_PRESENTATION } from "@/features/catalog/lib/product-presentation";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <ProductImage sku={product.sku} className="product-media" />
      <div className="product-card-info">
        <p className="product-category">{PRODUCT_PRESENTATION[product.sku].category}</p>
        <h2 className="product-name">
          <Link href={`/shop/${product.sku}`} prefetch={false} className="product-link">
            {product.name}
          </Link>
        </h2>
        <div className="product-card-footer">
          <div className="product-card-meta">
            <p className="product-price">{formatMoney(product.priceCents)}</p>
            <p className="stock-note" data-sold-out={product.remaining === 0}>
              {formatRemaining(product.remaining)}
            </p>
          </div>
          <span className="product-arrow" aria-hidden="true">↗</span>
        </div>
      </div>
    </article>
  );
}
