import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="missing-page enter">
      <h1 id="not-found-heading" className="display page-title">
        Item not found
      </h1>
      <p className="text-muted">The shop does not sell an item with that code.</p>
      <Link href="/shop" className="button button-primary">
        See all items
      </Link>
    </section>
  );
}
