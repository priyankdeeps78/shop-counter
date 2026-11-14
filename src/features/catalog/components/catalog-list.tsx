import type { Product } from "@/types/domain";
import { ProductCard } from "./product-card";

export function CatalogList({ products }: { products: readonly Product[] }) {
  const count = products.length;
  return (
    <div className="space-y-4">
      {/* Same element for every result, so screen readers announce each change. */}
      <p role="status" className="text-sm text-muted">
        {count === 0 ? "No items match" : `${count} ${count === 1 ? "item" : "items"}`}
      </p>
      {count > 0 && (
        <ul aria-label="Products" className="grid gap-3 sm:grid-cols-2">
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
