export type CartLine = { sku: string; qty: number };

export const CART_CHANGED_MESSAGE =
  "Your cart changed after payment started. You will be charged the amount below.";

export function cartTotalCents(lines: CartLine[], priceOf: (sku: string) => number): number {
  return lines.reduce((sum, line) => sum + priceOf(line.sku) * line.qty, 0);
}

/** True when both carts hold the same sku and quantity pairs, in any order. */
export function sameLines(a: CartLine[], b: CartLine[]): boolean {
  const key = (lines: CartLine[]) =>
    lines
      .filter((l) => l.qty > 0)
      .map((l) => `${l.sku}:${l.qty}`)
      .sort()
      .join(",");
  return key(a) === key(b);
}

/** Sets a line's quantity; 0 or less removes it. Keeps the order lines were added in. */
export function setQty(lines: CartLine[], sku: string, qty: number): CartLine[] {
  if (qty <= 0) return lines.filter((l) => l.sku !== sku);
  if (lines.some((l) => l.sku === sku)) {
    return lines.map((l) => (l.sku === sku ? { ...l, qty } : l));
  }
  return [...lines, { sku, qty }];
}

/**
 * What is left in the cart once `bought` has been paid for. Lines added after
 * Pay stay, so a shopper who added a pen mid-payment still has the pen.
 */
export function subtractLines(cart: CartLine[], bought: CartLine[]): CartLine[] {
  return bought.reduce((left, b) => {
    const current = left.find((l) => l.sku === b.sku)?.qty ?? 0;
    return setQty(left, b.sku, current - b.qty);
  }, cart);
}
