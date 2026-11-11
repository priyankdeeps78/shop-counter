import { describe, expect, it } from "vitest";
import { SEED_CATALOG } from "@/lib/seed";
import { filterAndSort, parseShopQuery, shopHref } from "@/lib/shop-query";

const names = (q: string, sort: string) =>
  filterAndSort([...SEED_CATALOG], parseShopQuery({ q, sort })).map((i) => i.name);

describe("shop query", () => {
  it("matches names ignoring case", () => {
    expect(names("STO", "")).toEqual(["Cedar stool"]);
    expect(names("sto", "price-desc")).toEqual(["Cedar stool"]);
    expect(names("zzz", "")).toEqual([]);
  });

  it("sorts by name by default and by price either way", () => {
    expect(names("", "")).toEqual(["Cedar stool", "Field notebook", "Gel pen", "Maple lamp", "Slip case"]);
    expect(names("", "price-asc")[0]).toBe("Gel pen");
    expect(names("", "price-desc")[0]).toBe("Cedar stool");
    expect(names("", "bogus")[0]).toBe("Cedar stool");
  });

  it("leaves defaults out of the URL", () => {
    expect(shopHref({ q: "", sort: "name" })).toBe("/shop");
    expect(shopHref({ q: " lamp ", sort: "price-asc" })).toBe("/shop?q=lamp&sort=price-asc");
  });
});
