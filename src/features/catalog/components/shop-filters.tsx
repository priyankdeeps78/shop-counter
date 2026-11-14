"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition, type ReactNode } from "react";
import { CatalogueLoading } from "@/components/loading";
import {
  SORT_OPTIONS,
  buildShopSearch,
  parseSort,
  type SortKey,
} from "@/features/catalog/lib/filter-catalog";

export const SEARCH_DEBOUNCE_MS = 300;

type Props = {
  /** `q` as the server read it from the URL for the list currently shown. */
  q: string;
  /** `sort` as the server read it from the URL. */
  sort: SortKey;
  children?: ReactNode;
};

/**
 * Search and Sort controls. The URL is the only source of truth: every change
 * navigates to a new /shop URL and the server renders the matching list.
 *
 * History: the first search change after the URL last changed from outside
 * (page load, Back/Forward, a sort change) pushes a new entry, so Back returns
 * to the previous filter; later keystrokes in that edit replace it, so typing
 * does not add one entry per letter. Each Sort change pushes.
 *
 * The inputs are uncontrolled (`defaultValue`) and synced from the URL through
 * refs. That keeps text typed before hydration, and avoids fighting the user's
 * typing while a navigation is still in flight.
 */
export function ShopFilters({ q, sort, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLSelectElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** The `q` this component last showed or navigated to. */
  const lastQ = useRef(q);
  /** `q` values navigated to whose server render has not arrived yet, oldest first. */
  const pendingQs = useRef<string[]>([]);
  /** Whether the current search edit already has its own history entry. */
  const searchEntryPushed = useRef(false);
  /** The `q` prop from the previous render, to react only to real changes. */
  const previousQProp = useRef(q);
  const checkedPreHydrationInput = useRef(false);

  const navigate = useCallback(
    (mode: "push" | "replace") => {
      clearTimeout(debounceTimer.current);
      const nextQ = (searchRef.current?.value ?? "").trim();
      const nextSort = parseSort(sortRef.current?.value);
      if (nextQ !== lastQ.current) {
        lastQ.current = nextQ;
        pendingQs.current.push(nextQ);
      }
      const search = buildShopSearch(new URLSearchParams(window.location.search), {
        q: nextQ,
        sort: nextSort,
      });
      startTransition(() => {
        router[mode](search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    },
    [router, pathname],
  );

  const commitSearch = useCallback(() => {
    clearTimeout(debounceTimer.current);
    if ((searchRef.current?.value ?? "").trim() === lastQ.current) return;
    navigate(searchEntryPushed.current ? "replace" : "push");
    searchEntryPushed.current = true;
  }, [navigate]);

  // The server rendered a different `q`.
  useEffect(() => {
    if (q === previousQProp.current) return; // no real change (also skips Strict Mode re-runs)
    previousQProp.current = q;

    const ownIndex = pendingQs.current.indexOf(q);
    if (ownIndex !== -1) {
      // One of our own navigations landed; the input already shows newer text.
      pendingQs.current.splice(0, ownIndex + 1);
      return;
    }
    // Back/Forward or a link changed the URL: show it, and start a fresh edit.
    pendingQs.current = [];
    lastQ.current = q;
    searchEntryPushed.current = false;
    if (searchRef.current) searchRef.current.value = q;
  }, [q]);

  useEffect(() => {
    if (sortRef.current) sortRef.current.value = sort;
  }, [sort]);

  // Apply anything typed or chosen before the page hydrated.
  useEffect(() => {
    if (checkedPreHydrationInput.current) return;
    checkedPreHydrationInput.current = true;
    const typedQ = (searchRef.current?.value ?? "").trim();
    const chosenSort = parseSort(sortRef.current?.value);
    if (typedQ !== lastQ.current || chosenSort !== sort) {
      navigate("push");
      searchEntryPushed.current = true;
    }
  }, [navigate, sort]);

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  return (
    <>
      {/* A plain GET form, so Enter still filters if JavaScript has not loaded yet. */}
      <form
        role="search"
        aria-label="Catalogue"
        action={pathname}
        method="get"
        onSubmit={(event) => {
          event.preventDefault();
          commitSearch();
        }}
        className="filter-bar"
      >
        <div className="filter-field">
          <label htmlFor="shop-search">
            Search
          </label>
          <input
            ref={searchRef}
            id="shop-search"
            name="q"
            type="search"
            defaultValue={q}
            autoComplete="off"
            onChange={() => {
              clearTimeout(debounceTimer.current);
              debounceTimer.current = setTimeout(commitSearch, SEARCH_DEBOUNCE_MS);
            }}
            onBlur={() => {
              commitSearch();
              searchEntryPushed.current = false;
            }}
            placeholder="Find an item…"
            className="field-control search-control"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="shop-sort">
            Sort
          </label>
          <select
            ref={sortRef}
            id="shop-sort"
            name="sort"
            defaultValue={sort}
            onChange={() => {
              navigate("push");
              searchEntryPushed.current = false;
            }}
            className="field-control"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div className="catalogue-grid-region" data-pending={isPending}>
        <div className="catalogue-grid-content" inert={isPending}>{children}</div>
        {isPending && <CatalogueLoading>Updating results…</CatalogueLoading>}
      </div>
    </>
  );
}
