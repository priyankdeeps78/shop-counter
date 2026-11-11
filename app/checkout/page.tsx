import type { Metadata } from "next";
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
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <Checkout products={products} />
    </>
  );
}
