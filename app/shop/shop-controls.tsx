"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { parseShopQuery, shopHref, type ShopQuery } from "@/lib/shop-query";

const SEARCH_DELAY_MS = 300;

/**
 * Search and sort live in the URL; this component only writes to it.
 *
 * - Each settled change is a `router.push`, so Back walks through earlier
 *   filters. Typing is debounced so "lamp" is one history entry, not four.
 * - The fields are uncontrolled and every navigation reads them from the
 *   form. Nothing typed before hydration is lost, and the form is a plain GET
 *   form that works without JavaScript at all.
 */
export function ShopControls({ q, sort }: ShopQuery) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPushedQ = useRef<string | null>(null);
  const renderedQ = useRef(q);

  function readForm(): ShopQuery {
    const data = new FormData(formRef.current ?? undefined);
    return parseShopQuery({
      q: String(data.get("q") ?? ""),
      sort: String(data.get("sort") ?? ""),
    });
  }

  function navigateNow() {
    clearTimeout(timer.current);
    const next = readForm();
    lastPushedQ.current = next.q;
    startTransition(() => router.push(shopHref(next), { scroll: false }));
  }

  function navigateSoon() {
    clearTimeout(timer.current);
    timer.current = setTimeout(navigateNow, SEARCH_DELAY_MS);
  }

  useEffect(() => {
    const input = searchRef.current;
    if (!input) return;
    if (renderedQ.current === q) {
      // First render after hydration: apply anything typed before it.
      if (input.value.trim() !== q) navigateSoon();
      return;
    }
    renderedQ.current = q;
    // The URL caught up with our own push: leave the field alone, the user
    // may have typed more since.
    if (q === lastPushedQ.current) {
      lastPushedQ.current = null;
      return;
    }
    // The URL changed from outside (Back/Forward): show it.
    input.value = q;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only URL changes should sync the field
  }, [q]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      ref={formRef}
      role="search"
      aria-label="Filter items"
      action="/shop"
      method="get"
      className="card mt-8 flex flex-wrap items-end gap-4 p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        navigateNow();
      }}
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <label htmlFor="shop-search" className="text-sm font-semibold">
          Search
        </label>
        <input
          ref={searchRef}
          id="shop-search"
          name="q"
          type="search"
          defaultValue={q}
          autoComplete="off"
          placeholder="Lamp, pen, stool…"
          className="input"
          onChange={navigateSoon}
        />
      </div>
      <div className="flex w-full flex-col gap-1.5 sm:w-56">
        <label htmlFor="shop-sort" className="text-sm font-semibold">
          Sort
        </label>
        <select
          // Remount when the URL's sort changes (e.g. Back) so the select shows it.
          key={sort}
          id="shop-sort"
          name="sort"
          defaultValue={sort}
          className="select"
          onChange={navigateNow}
        >
          <option value="name">Name</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
        </select>
      </div>
      <button type="submit" className="btn-secondary w-full sm:w-auto">
        Apply
      </button>
    </form>
  );
}
