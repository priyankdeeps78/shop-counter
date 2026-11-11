import { z } from "zod";
import { CHECKOUT_SKUS } from "./seed";
import { findItem } from "./store";
import type { PricedLine } from "./types";

// Only sku and qty are read. Anything else the client sends, including
// `unitPriceCents`, is stripped by zod and never reaches pricing.
const beginSchema = z.object({
  lines: z
    .array(
      z.object({
        sku: z.enum(CHECKOUT_SKUS),
        qty: z.number().int().min(1),
      }),
    )
    .min(1),
});

/**
 * Prices a client cart from the catalogue. Answers `null` for an empty cart,
 * an unknown sku (anything outside the checkout range counts as unknown here),
 * or a quantity below 1. Repeated skus are merged into one line.
 */
export function priceCart(body: unknown): PricedLine[] | null {
  const parsed = beginSchema.safeParse(body);
  if (!parsed.success) return null;

  const qtyBySku = new Map<string, number>();
  for (const line of parsed.data.lines) {
    qtyBySku.set(line.sku, (qtyBySku.get(line.sku) ?? 0) + line.qty);
  }

  const priced: PricedLine[] = [];
  for (const [sku, qty] of qtyBySku) {
    const item = findItem(sku);
    if (!item) return null;
    priced.push({ sku, name: item.name, unitPriceCents: item.priceCents, qty });
  }
  return priced;
}

export const completeSchema = z.object({ attemptId: z.string().min(1) });
