import type { Metadata } from "next";
import { CheckoutClient, type CheckoutProduct } from "@/features/checkout/components/checkout-client";
import { getCatalog } from "@/server/catalog";
import { CHECKOUT_SKUS, type CheckoutSku } from "@/types/domain";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Buy field notebooks, gel pens, and slip cases.",
};

const isCheckoutSku = (sku: string): sku is CheckoutSku => (CHECKOUT_SKUS as readonly string[]).includes(sku);

export default async function CheckoutPage() {
  // Names and unit prices from the cached catalogue; the cart itself lives in the browser.
  const products: CheckoutProduct[] = (await getCatalog()).flatMap((product) =>
    isCheckoutSku(product.sku) ? [{ sku: product.sku, name: product.name, priceCents: product.priceCents }] : [],
  );

  return (
    <section aria-labelledby="page-heading" className="space-y-6">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Checkout
      </h1>
      <CheckoutClient products={products} />
    </section>
  );
}
