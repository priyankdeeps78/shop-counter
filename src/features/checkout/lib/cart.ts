// The live cart: pure, client-safe state helpers. Money is integer cents.
import type { CheckoutSku, SnapshotLine } from "@/types/domain";

export type CartLine = { sku: CheckoutSku; qty: number };
/** One line per item, in the order items were added. */
export type Cart = readonly CartLine[];

export type CartAction =
  | { type: "add" | "increase" | "decrease" | "remove"; sku: CheckoutSku }
  | { type: "clear" };

export function cartReducer(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "add":
      return cart.some((line) => line.sku === action.sku) ? cart : [...cart, { sku: action.sku, qty: 1 }];
    case "increase":
      return cart.map((line) => (line.sku === action.sku ? { ...line, qty: line.qty + 1 } : line));
    case "decrease": // down to 0 removes the line
      return cart.flatMap((line) =>
        line.sku !== action.sku ? [line] : line.qty > 1 ? [{ ...line, qty: line.qty - 1 }] : [],
      );
    case "remove":
      return cart.filter((line) => line.sku !== action.sku);
    case "clear":
      return [];
  }
}

/** Catalogue unit price × quantity, added up. */
export function cartTotalCents(cart: Cart, unitPriceCents: Readonly<Record<CheckoutSku, number>>): number {
  return cart.reduce((total, line) => total + unitPriceCents[line.sku] * line.qty, 0);
}

/** True when the cart holds exactly the snapshot's sku + quantity pairs (order does not matter). */
export function matchesSnapshot(cart: Cart, snapshot: readonly Pick<SnapshotLine, "sku" | "qty">[]): boolean {
  return (
    cart.length === snapshot.length &&
    snapshot.every((line) => cart.some((item) => item.sku === line.sku && item.qty === line.qty))
  );
}
