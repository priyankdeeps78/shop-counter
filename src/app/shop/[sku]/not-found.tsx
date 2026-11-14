import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="space-y-4">
      <h1 id="not-found-heading" className="text-2xl font-semibold">
        Item not found
      </h1>
      <p className="text-muted">The shop does not sell an item with that code.</p>
      <Link href="/shop" className="font-medium text-accent underline">
        See all items
      </Link>
    </section>
  );
}
