import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetails } from "@/features/catalog/components/product-details";
import { describeProduct } from "@/features/catalog/lib/describe-product";
import { getCatalog, getCatalogItem } from "@/server/catalog";

/** Every catalogue item is prerendered at build; other skus render on request and 404. */
export async function generateStaticParams() {
  return (await getCatalog()).map((product) => ({ sku: product.sku }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[sku]">): Promise<Metadata> {
  const product = await getCatalogItem((await params).sku);
  if (!product) return { title: "Item not found" };
  // The root layout's title template turns this into "<name> | Shop counter".
  return { title: product.name, description: describeProduct(product) };
}

// No <Suspense> around this page: the sku check and `notFound()` run before any
// HTML is sent, which is what makes an unknown sku answer HTTP 404, not 200.
// Unknown skus normally never get here: `src/proxy.ts` sends them to the
// server-rendered 404 page first. This check stays as the safety net.
export default async function ProductPage({ params }: PageProps<"/shop/[sku]">) {
  const product = await getCatalogItem((await params).sku);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link href="/shop" className="text-sm font-medium text-accent underline underline-offset-4">
        Back to the shop
      </Link>
      <ProductDetails product={product} />
    </div>
  );
}
