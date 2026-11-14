import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { UNMATCHED_PATH, config, proxy } from "@/proxy";
import { SKUS, isSku } from "@/types/domain";

const run = (path: string) => proxy(new NextRequest(`http://localhost${path}`));
const rewrittenTo = (response: Response) => response.headers.get("x-middleware-rewrite");

describe("proxy (unknown /shop/<sku>)", () => {
  it("lets every catalogue sku through unchanged", () => {
    for (const sku of SKUS) {
      const response = run(`/shop/${sku}`);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(rewrittenTo(response)).toBeNull();
    }
  });

  it.each(["/shop/not-a-sku", "/shop/LAMP", "/shop/Pen", "/shop/lamp%20", "/shop/%E0%A4%A", "/shop/cushion"])(
    "rewrites %s to a path no route matches",
    (path) => {
      expect(rewrittenTo(run(path))).toBe(`http://localhost${UNMATCHED_PATH}`);
    },
  );

  it("only runs on single-segment /shop paths", () => {
    expect(config.matcher).toBe("/shop/:sku");
  });
});

describe("isSku", () => {
  it("accepts exactly the five catalogue skus", () => {
    expect(SKUS.filter(isSku)).toEqual(["lamp", "stool", "notebook", "pen", "case"]);
    expect(isSku("Lamp")).toBe(false);
    expect(isSku("")).toBe(false);
  });
});
