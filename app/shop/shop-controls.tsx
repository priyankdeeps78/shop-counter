"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { shopHref, type Sort, type ShopQuery } from "@/lib/shop-query";

const SEARCH_DELAY_MS = 300;

/**
 * Search and sort live in the URL; this component only writes to it.
 *
 * Each settled change is a `router.push`, so Back walks through earlier
 * filters. Typing is debounced so "lamp" is one history entry, not four.
 * The form is a plain GET form too, so it still works before hydration.
 */
export function ShopControls({ q, sort }: ShopQuery) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [text, setText] = useState(q);
  // When the URL changes under us (Back/Forward), show its value. Skip the
  // update when the URL is just catching up with what we pushed, so letters
  // typed while that navigation was in flight are not overwritten.
  const [syncedQ, setSyncedQ] = useState(q);
  const [pushedQ, setPushedQ] = useState<string | null>(null);
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (q === pushedQ) setPushedQ(null);
    else setText(q);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function navigate(next: ShopQuery) {
    clearTimeout(timer.current);
    const href = shopHref(next);
    setPushedQ(next.q.trim());
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <form
      role="search"
      aria-label="Filter items"
      action="/shop"
      method="get"
      className="mt-6 flex flex-wrap items-end gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: text, sort });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="shop-search" className="text-sm font-medium">
          Search
        </label>
        <input
          id="shop-search"
          name="q"
          type="search"
          value={text}
          autoComplete="off"
          className="rounded border border-stone-400 px-2 py-1"
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => navigate({ q: value, sort }), SEARCH_DELAY_MS);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="shop-sort" className="text-sm font-medium">
          Sort
        </label>
        <select
          // Remount when the URL's sort changes (e.g. Back) so the uncontrolled
          // select shows it, without fighting the user's own selection.
          key={sort}
          id="shop-sort"
          name="sort"
          defaultValue={sort}
          className="rounded border border-stone-400 px-2 py-1"
          onChange={(event) => navigate({ q: text, sort: event.target.value as Sort })}
        >
          <option value="name">Name</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
        </select>
      </div>
      <button type="submit" className="rounded border border-stone-400 px-3 py-1">
        Apply
      </button>
    </form>
  );
}
