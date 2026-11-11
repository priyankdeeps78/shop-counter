import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getCatalog } from "@/lib/catalog";
import { CHECKOUT_SKUS } from "@/lib/seed";
import { Checkout } from "./checkout";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Buy field notebooks, gel pens and slip cases.",
};

/**
 * Server part: the product list and unit prices, from the cached catalogue,
 * so this page is static. The cart is browser state, so it lives in a Client
 * Component. The prices shown here are for display only: the server prices
 * the cart again when Pay is pressed.
 */
export default async function CheckoutPage() {
  const catalog = await getCatalog();
  const products = CHECKOUT_SKUS.flatMap((sku) => {
    const item = catalog.find((i) => i.sku === sku);
    return item ? [{ sku: item.sku, name: item.name, priceCents: item.priceCents }] : [];
  });

  return (
    <>
      <PageHeader eyebrow="Stationery" title="Checkout">
        The amount you see when you press Pay is the amount you are charged.
      </PageHeader>
      <Checkout products={products} />
    </>
  );
}
