import { describe, expect, it } from "vitest";
import { describeProduct } from "@/features/catalog/lib/describe-product";
import type { Product } from "@/types/domain";
import { INITIAL_CATALOG } from "../support/catalog-contract";

const product = (index: number) => structuredClone(INITIAL_CATALOG[index]) as unknown as Product;

describe("describeProduct", () => {
  it("names the item and its price", () => {
    expect(describeProduct(product(0))).toBe("Maple lamp for $80 at Shop counter.");
    expect(describeProduct(product(3))).toBe("Gel pen for $4 at Shop counter.");
  });

  it("lists optional extras with their prices", () => {
    expect(describeProduct(product(1))).toBe(
      "Cedar stool for $120 at Shop counter. Optional extra: Cushion ($25).",
    );
  });

  it("does not change when stock changes", () => {
    const lamp = product(0);
    const before = describeProduct(lamp);
    lamp.remaining = 0;
    expect(describeProduct(lamp)).toBe(before);
  });
});
