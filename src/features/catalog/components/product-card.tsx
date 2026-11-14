import Link from "next/link";
import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">
        <Link href={`/shop/${product.sku}`} prefetch={false} className="underline-offset-4 hover:underline">
          {product.name}
        </Link>
      </h2>
      <p className="text-base">{formatMoney(product.priceCents)}</p>
      <p className="text-sm text-muted">{formatRemaining(product.remaining)}</p>
    </article>
  );
}
