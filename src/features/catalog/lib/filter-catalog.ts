// Pure, client-safe helpers for the /shop URL state: no server or React imports.
import type { Product } from "@/types/domain";

export const SORT_KEYS = ["name", "price-asc", "price-desc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "name";

export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type ShopQuery = { q: string; sort: SortKey };

type RawSearchParams = Record<string, string | string[] | undefined>;

/** The first value of a search param, whether Next.js gave a string or an array. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Any unknown or missing sort falls back to the default (`name`). */
export function parseSort(value: unknown): SortKey {
  return SORT_KEYS.find((key) => key === value) ?? DEFAULT_SORT;
}

/** Reads `?q=` and `?sort=` from page search params. `q` is trimmed. */
export function parseShopQuery(searchParams: RawSearchParams): ShopQuery {
  return {
    q: (firstValue(searchParams.q) ?? "").trim(),
    sort: parseSort(firstValue(searchParams.sort)),
  };
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "en");

const COMPARATORS: Record<SortKey, (a: Product, b: Product) => number> = {
  name: byName,
  "price-asc": (a, b) => a.priceCents - b.priceCents || byName(a, b),
  "price-desc": (a, b) => b.priceCents - a.priceCents || byName(a, b),
};

/**
 * Products whose name contains `q` (ignoring case), in the chosen order.
 * Returns a new array; the input is never changed.
 */
export function filterAndSortCatalog(products: readonly Product[], query: ShopQuery): Product[] {
  const needle = query.q.trim().toLowerCase();
  return products
    .filter((product) => product.name.toLowerCase().includes(needle))
    .sort(COMPARATORS[query.sort]);
}

/**
 * The search string for a new /shop URL. Keeps every other param from `current`,
 * drops `q` when empty and `sort` when it is the default.
 */
export function buildShopSearch(current: URLSearchParams, query: ShopQuery): string {
  const next = new URLSearchParams(current);
  const q = query.q.trim();
  if (q) next.set("q", q);
  else next.delete("q");
  if (query.sort === DEFAULT_SORT) next.delete("sort");
  else next.set("sort", query.sort);
  return next.toString();
}
