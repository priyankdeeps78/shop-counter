import { formatMoney } from "@/lib/format-money";
import type { Product } from "@/types/domain";

/**
 * Meta description for a product page, e.g.
 * "Cedar stool for $120 at Shop counter. Optional extra: Cushion ($25)."
 * Stock is left out on purpose: it changes with every sale, the description should not.
 */
export function describeProduct(product: Product): string {
  const extras = product.extras.map((extra) => `${extra.name} (${formatMoney(extra.priceCents)})`);
  const extrasText =
    extras.length === 0 ? "" : ` Optional ${extras.length === 1 ? "extra" : "extras"}: ${extras.join(", ")}.`;
  return `${product.name} for ${formatMoney(product.priceCents)} at Shop counter.${extrasText}`;
}
