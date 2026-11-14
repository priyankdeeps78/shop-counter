// Shared domain types. Client-safe: no server imports. Money is always integer cents.

/** Items the staff desk can record payments for. */
export const DESK_SKUS = ["lamp", "stool"] as const;
/** Items sold through the checkout. */
export const CHECKOUT_SKUS = ["notebook", "pen", "case"] as const;
export const SKUS = [...DESK_SKUS, ...CHECKOUT_SKUS] as const;

export type DeskSku = (typeof DESK_SKUS)[number];
export type CheckoutSku = (typeof CHECKOUT_SKUS)[number];
export type Sku = (typeof SKUS)[number];

export type ExtraCode = "cushion";

export type Extra = {
  code: ExtraCode;
  name: string;
  priceCents: number;
};

export type Product = {
  sku: Sku;
  name: string;
  priceCents: number;
  /** Units left; `null` means the item is not stock-limited (not "zero left"). */
  remaining: number | null;
  extras: Extra[];
};

// ---------------------------------------------------------------------------
// Staff desk payments
// ---------------------------------------------------------------------------

export type PaymentField = "email" | "sku" | "externalChargeId" | "extraCode";

/** Raw input to `validatePayment`. Values come from the client and are unchecked. */
export type PaymentInput = {
  email?: unknown;
  sku?: unknown;
  externalChargeId?: unknown;
  extraCode?: unknown;
};

/** A payment input that passed validation, with the email trimmed and lowercased. */
export type ValidPayment = {
  email: string;
  sku: DeskSku;
  externalChargeId: string;
  extraCode: ExtraCode | null;
};

/** Only the fields that failed are present. */
export type PaymentFieldErrors = Partial<Record<PaymentField, string>>;

/** A recorded payment, priced by the server. Shape of `payment` in `POST /api/payments`. */
export type Payment = {
  email: string;
  sku: DeskSku;
  itemName: string;
  extraCode: ExtraCode | null;
  externalChargeId: string;
  totalCents: number;
};

/** Shape of `preview` in `POST /api/payments/preview`. */
export type PaymentPreview = {
  email: string;
  sku: DeskSku;
  itemName: string;
  extraCode: ExtraCode | null;
  extraName: string | null;
  totalCents: number;
  remainingAfter: number | null;
};

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/** One server-priced line frozen when Pay was pressed. */
export type SnapshotLine = {
  sku: CheckoutSku;
  name: string;
  unitPriceCents: number;
  qty: number;
};

/** An immutable checkout attempt: the cart as it was when Pay was pressed. */
export type CheckoutAttempt = {
  attemptId: string;
  lines: readonly SnapshotLine[];
  amountCents: number;
};

export type Order = {
  orderId: string;
  attemptId: string;
  lines: readonly SnapshotLine[];
  amountCents: number;
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type Result<T, E> = { ok: true; value: T } | { ok: false; errors: E };
