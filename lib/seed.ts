import type { CatalogItem } from "./types";

/** Starting catalogue. The store copies this on boot and on reset. */
export const SEED_CATALOG: readonly CatalogItem[] = [
  { sku: "lamp", name: "Maple lamp", priceCents: 8000, remaining: 5, extras: [] },
  {
    sku: "stool",
    name: "Cedar stool",
    priceCents: 12000,
    remaining: 2,
    extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
  },
  { sku: "notebook", name: "Field notebook", priceCents: 1500, remaining: null, extras: [] },
  { sku: "pen", name: "Gel pen", priceCents: 400, remaining: null, extras: [] },
  { sku: "case", name: "Slip case", priceCents: 2200, remaining: null, extras: [] },
];

/** Items the staff desk records payments for. */
export const DESK_SKUS = ["lamp", "stool"] as const;
export type DeskSku = (typeof DESK_SKUS)[number];

/** Items sold through /checkout. */
export const CHECKOUT_SKUS = ["notebook", "pen", "case"] as const;
