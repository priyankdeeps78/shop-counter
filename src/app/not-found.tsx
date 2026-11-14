import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you asked for does not exist.",
};

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="missing-page enter">
      <h1 id="not-found-heading" className="display page-title">
        Page not found
      </h1>
      <p className="text-muted">We could not find the page you asked for.</p>
      <Link href="/shop" className="button button-primary">
        Back to the shop
      </Link>
    </section>
  );
}
