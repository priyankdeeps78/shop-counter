import type { CatalogItem } from "./types";

export const SORTS = ["name", "price-asc", "price-desc"] as const;
export type Sort = (typeof SORTS)[number];
export const DEFAULT_SORT: Sort = "name";

export type ShopQuery = { q: string; sort: Sort };

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Reads `?q=` and `?sort=` leniently: unknown sorts fall back to `name`. */
export function parseShopQuery(params: RawParams): ShopQuery {
  const q = first(params.q).trim();
  const sort = first(params.sort);
  return { q, sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : DEFAULT_SORT };
}

/** `/shop` URL for a query, leaving defaults out so the plain URL stays `/shop`. */
export function shopHref({ q, sort }: ShopQuery): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  const search = params.toString();
  return search ? `/shop?${search}` : "/shop";
}

export function filterAndSort(items: CatalogItem[], { q, sort }: ShopQuery): CatalogItem[] {
  const needle = q.toLowerCase();
  const matches = needle
    ? items.filter((item) => item.name.toLowerCase().includes(needle))
    : [...items];

  const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name, "en");
  const compare: Record<Sort, (a: CatalogItem, b: CatalogItem) => number> = {
    name: byName,
    "price-asc": (a, b) => a.priceCents - b.priceCents || byName(a, b),
    "price-desc": (a, b) => b.priceCents - a.priceCents || byName(a, b),
  };
  return matches.sort(compare[sort]);
}

export function stockLabel(remaining: number | null): string {
  return remaining === null ? "Not stock-limited" : `${remaining} left`;
}
