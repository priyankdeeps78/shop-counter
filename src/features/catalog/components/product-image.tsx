import Image from "next/image";
import type { Sku } from "@/types/domain";

export function ProductImage({ sku, className }: { sku: Sku; className?: string }) {
  return (
    <div className={className} data-product={sku}>
      <Image src={`/shop-images/${sku}.webp`} alt="" fill unoptimized />
    </div>
  );
}
