import type { Product } from "@/types/domain";
import { ProductCard } from "./product-card";

export function CatalogList({ products }: { products: readonly Product[] }) {
  const count = products.length;
  return (
    <div className="catalogue-results">
      {/* Same element for every result, so screen readers announce each change. */}
      <p role="status" className={count === 0 ? "catalogue-empty" : "results-count"}>
        {count === 0 ? "No items match" : `${count} ${count === 1 ? "item" : "items"}`}
      </p>
      {count > 0 && (
        <ul aria-label="Products" className="product-grid">
          {products.map((product) => (
            <li key={product.sku}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
