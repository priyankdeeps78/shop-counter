import { describe, expect, it } from "vitest";
import {
  buildShopSearch,
  filterAndSortCatalog,
  parseShopQuery,
  parseSort,
} from "@/features/catalog/lib/filter-catalog";
import { formatRemaining } from "@/lib/format-stock";
import type { Product } from "@/types/domain";
import { INITIAL_CATALOG } from "../support/catalog-contract";

const catalog = (): Product[] => structuredClone(INITIAL_CATALOG) as unknown as Product[];
const skus = (products: Product[]) => products.map((product) => product.sku);

describe("parseShopQuery", () => {
  it("defaults to no search and name order", () => {
    expect(parseShopQuery({})).toEqual({ q: "", sort: "name" });
  });

  it("reads q and sort, trimming q", () => {
    expect(parseShopQuery({ q: "  sto ", sort: "price-desc" })).toEqual({ q: "sto", sort: "price-desc" });
  });

  it("uses the first value when a param repeats", () => {
    expect(parseShopQuery({ q: ["lamp", "pen"], sort: ["price-asc", "name"] })).toEqual({
      q: "lamp",
      sort: "price-asc",
    });
  });

  it("falls back to name for an unknown sort", () => {
    expect(parseShopQuery({ sort: "cheapest" }).sort).toBe("name");
    expect(parseSort(undefined)).toBe("name");
    expect(parseSort("PRICE-ASC")).toBe("name");
  });
});

describe("filterAndSortCatalog", () => {
  it("shows every item, by name, with no search", () => {
    expect(skus(filterAndSortCatalog(catalog(), { q: "", sort: "name" }))).toEqual([
      "stool",
      "notebook",
      "pen",
      "lamp",
      "case",
    ]);
  });

  it("matches names ignoring case", () => {
    expect(skus(filterAndSortCatalog(catalog(), { q: "LAMP", sort: "name" }))).toEqual(["lamp"]);
    expect(skus(filterAndSortCatalog(catalog(), { q: "mApLe", sort: "name" }))).toEqual(["lamp"]);
  });

  it("matches q=sto with price-desc to only the Cedar stool", () => {
    expect(skus(filterAndSortCatalog(catalog(), { q: "sto", sort: "price-desc" }))).toEqual(["stool"]);
  });

  it("matches names only, not skus", () => {
    expect(filterAndSortCatalog(catalog(), { q: "notebook", sort: "name" })).toHaveLength(1);
    expect(filterAndSortCatalog(catalog(), { q: "case", sort: "name" })).toHaveLength(1);
    expect(filterAndSortCatalog(catalog(), { q: "cushion", sort: "name" })).toHaveLength(0);
  });

  it("returns nothing when no name matches", () => {
    expect(filterAndSortCatalog(catalog(), { q: "zzz", sort: "name" })).toEqual([]);
  });

  it("sorts by price both ways", () => {
    expect(skus(filterAndSortCatalog(catalog(), { q: "", sort: "price-asc" }))).toEqual([
      "pen",
      "notebook",
      "case",
      "lamp",
      "stool",
    ]);
    expect(skus(filterAndSortCatalog(catalog(), { q: "", sort: "price-desc" }))).toEqual([
      "stool",
      "lamp",
      "case",
      "notebook",
      "pen",
    ]);
  });

  it("never changes the input array", () => {
    const input = catalog();
    const before = skus(input);
    filterAndSortCatalog(input, { q: "", sort: "price-desc" });
    expect(skus(input)).toEqual(before);
  });
});

describe("buildShopSearch", () => {
  it("sets q and a non-default sort", () => {
    expect(buildShopSearch(new URLSearchParams(), { q: "lamp", sort: "price-desc" })).toBe(
      "q=lamp&sort=price-desc",
    );
  });

  it("drops an empty q and the default sort", () => {
    expect(buildShopSearch(new URLSearchParams("q=lamp&sort=price-asc"), { q: "  ", sort: "name" })).toBe("");
  });

  it("keeps other params, and keeps q when only sort changes", () => {
    expect(buildShopSearch(new URLSearchParams("q=s&ref=home"), { q: "s", sort: "price-asc" })).toBe(
      "q=s&ref=home&sort=price-asc",
    );
  });

  it("does not change the params it was given", () => {
    const current = new URLSearchParams("q=a");
    buildShopSearch(current, { q: "b", sort: "name" });
    expect(current.toString()).toBe("q=a");
  });
});

describe("formatRemaining", () => {
  it("shows a count for limited stock and a phrase for unlimited", () => {
    expect(formatRemaining(5)).toBe("5 left");
    expect(formatRemaining(0)).toBe("0 left");
    expect(formatRemaining(null)).toBe("Not stock-limited");
  });
});
