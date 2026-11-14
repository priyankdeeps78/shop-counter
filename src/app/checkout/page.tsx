import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Pay for notebooks, pens, and cases.",
};

export default function CheckoutPage() {
  return (
    <section aria-labelledby="page-heading" className="space-y-2">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Checkout
      </h1>
      <p className="text-muted">Coming soon.</p>
    </section>
  );
}
