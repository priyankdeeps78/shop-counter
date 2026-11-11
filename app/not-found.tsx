import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-xl px-8 py-14 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-4 text-muted">We could not find that page or item. It may never have been on the shelf.</p>
      <Link href="/shop" className="btn-primary mt-8">
        Back to the shop
      </Link>
    </div>
  );
}
