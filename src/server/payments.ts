import "server-only";
import { PAYMENT_ERRORS, validatePayment } from "@/features/payments/lib/payment-validation";
import { getStore, type Store } from "@/server/store";
import type { PaymentFieldErrors, PaymentPreview, Product, ValidPayment } from "@/types/domain";

export const SOLD_OUT = "Sold out";

/** Why a payment cannot go ahead. Routes map `reason` to an HTTP status. */
export type PaymentRejection =
  | { ok: false; reason: "invalid"; errors: PaymentFieldErrors }
  | { ok: false; reason: "sold_out"; errors: { sku: typeof SOLD_OUT } };

export function rejectionStatus(reason: PaymentRejection["reason"]): 400 | 409 {
  return reason === "invalid" ? 400 : 409;
}

type Quote = { ok: true; product: Product; extraName: string | null; totalCents: number };

/**
 * Prices a validated payment from the live store: item price plus extra price,
 * both taken from the catalogue, never from the client. Read-only.
 */
export function quotePayment(store: Store, payment: ValidPayment): Quote | PaymentRejection {
  const product = store.products.get(payment.sku);
  // `validatePayment` already limits sku to lamp/stool and the Cushion to the
  // stool; these checks keep the price tied to what the catalogue actually sells.
  if (!product) return { ok: false, reason: "invalid", errors: { sku: PAYMENT_ERRORS.sku } };
  const extra =
    payment.extraCode === null
      ? null
      : product.extras.find((candidate) => candidate.code === payment.extraCode);
  if (extra === undefined) {
    return { ok: false, reason: "invalid", errors: { extraCode: PAYMENT_ERRORS.extraCode } };
  }
  if (product.remaining !== null && product.remaining <= 0) {
    return { ok: false, reason: "sold_out", errors: { sku: SOLD_OUT } };
  }
  return {
    ok: true,
    product,
    extraName: extra?.name ?? null,
    totalCents: product.priceCents + (extra?.priceCents ?? 0),
  };
}

export type PreviewOutcome = { ok: true; preview: PaymentPreview } | PaymentRejection;

/**
 * What recording this payment would do, without doing it: validates with the
 * shared `validatePayment`, prices from the live store, and reports the stock
 * left afterwards. Writes nothing — no stock change, no queue entry, no stored
 * payment, no cache expiry — and reserves nothing.
 */
export function previewPayment(input: unknown, store: Store = getStore()): PreviewOutcome {
  const validation = validatePayment(input);
  if (!validation.ok) return { ok: false, reason: "invalid", errors: validation.errors };

  const payment = validation.value;
  const quote = quotePayment(store, payment);
  if (!quote.ok) return quote;

  const { remaining } = quote.product;
  return {
    ok: true,
    preview: {
      email: payment.email,
      sku: payment.sku,
      itemName: quote.product.name,
      extraCode: payment.extraCode,
      extraName: quote.extraName,
      totalCents: quote.totalCents,
      remainingAfter: remaining === null ? null : remaining - 1,
    },
  };
}
