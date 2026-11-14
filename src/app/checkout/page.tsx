import type { Metadata } from "next";
import Link from "next/link";
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
    <section aria-labelledby="page-heading" className="workspace enter">
      <header className="workspace-intro">
        <div>
          <h1 id="page-heading" className="display page-title">Checkout</h1>
          <p>Build your cart and review the amount before paying.</p>
        </div>
        <Link className="button button-secondary" href="/shop">
          <span aria-hidden="true">←</span> Back to shop
        </Link>
      </header>
      <CheckoutClient products={products} />
    </section>
  );
}
