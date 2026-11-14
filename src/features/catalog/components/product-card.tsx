import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <ProductImage sku={product.sku} className="product-media" />
      <div className="product-card-info">
        <h2 className="display product-name">
          <Link href={`/shop/${product.sku}`} prefetch={false} className="product-link">
            {product.name}<span aria-hidden="true" className="product-arrow" />
          </Link>
        </h2>
        <p className="product-price">{formatMoney(product.priceCents)}</p>
        <p className="stock-note">{formatRemaining(product.remaining)}</p>
      </div>
    </article>
  );
}
