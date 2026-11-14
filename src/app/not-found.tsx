import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you asked for does not exist.",
};

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="space-y-4">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Page not found
      </h1>
      <p className="text-muted">We could not find the page you asked for.</p>
      <Link href="/shop" className="font-medium text-accent underline">
        Back to the shop
      </Link>
    </section>
  );
}
