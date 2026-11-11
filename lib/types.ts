export type Extra = {
  code: string;
  name: string;
  priceCents: number;
};

export type CatalogItem = {
  sku: string;
  name: string;
  priceCents: number;
  /** `null` means the item is not stock-limited. */
  remaining: number | null;
  extras: Extra[];
};

export type Payment = {
  email: string;
  sku: string;
  itemName: string;
  extraCode: string | null;
  externalChargeId: string;
  totalCents: number;
};

export type PricedLine = {
  sku: string;
  name: string;
  unitPriceCents: number;
  qty: number;
};

export type CheckoutAttempt = {
  attemptId: string;
  lines: PricedLine[];
  amountCents: number;
};

export type Order = CheckoutAttempt & { orderId: string };
