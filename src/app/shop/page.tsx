import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the catalogue.",
};

export default function ShopPage() {
  return (
    <section aria-labelledby="page-heading" className="space-y-2">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Shop
      </h1>
      <p className="text-muted">Coming soon.</p>
    </section>
  );
}
