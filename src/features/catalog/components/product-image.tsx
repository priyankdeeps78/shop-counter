import Image from "next/image";
import type { Sku } from "@/types/domain";

export function ProductImage({
  sku,
  className,
  eager = false,
}: {
  sku: Sku;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={className} data-product={sku}>
      <Image
        src={`/shop-images/${sku}.webp`}
        alt=""
        fill
        unoptimized
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
      />
    </div>
  );
}
