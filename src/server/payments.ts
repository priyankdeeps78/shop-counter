import "server-only";
import { PAYMENT_ERRORS, validatePayment } from "@/features/payments/lib/payment-validation";
import { getStore, type Store } from "@/server/store";
import type {
  Payment,
  PaymentFieldErrors,
  PaymentPreview,
  Product,
  ValidPayment,
} from "@/types/domain";

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

export type RecordOutcome =
  | { ok: true; replayed: boolean; payment: Payment }
  | PaymentRejection;

/**
 * Records a staff payment, at most once per `externalChargeId`.
 *
 * 1. Validates with the shared `validatePayment` (never trusts that a preview ran).
 * 2. A charge id seen before is a replay: returns the original payment as stored
 *    (its own sku, total, email) and changes nothing — even if this request names
 *    a different item, and even if the item has sold out since.
 * 3. A new charge is priced from the live store; finite stock at 0 is "Sold out".
 * 4. Otherwise takes exactly 1 off finite stock, stores the payment by charge id,
 *    and appends it to the queue.
 *
 * Steps 2–4 run synchronously with no `await`, so within this one Node.js
 * process no other request can interleave between the replay check, the stock
 * check, the decrement, and the save. That does not hold across processes or
 * serverless instances, which each have their own store (see ARCHITECTURE.md).
 *
 * The caller expires the catalogue cache when `replayed` is false.
 */
export function recordPayment(input: unknown, store: Store = getStore()): RecordOutcome {
  const validation = validatePayment(input);
  if (!validation.ok) return { ok: false, reason: "invalid", errors: validation.errors };
  const request = validation.value;

  // --- critical section: synchronous from here to the return -----------------
  const original = store.paymentsByChargeId.get(request.externalChargeId);
  if (original) return { ok: true, replayed: true, payment: { ...original } };

  const quote = quotePayment(store, request);
  if (!quote.ok) return quote;

  const payment: Payment = Object.freeze({
    email: request.email,
    sku: request.sku,
    itemName: quote.product.name,
    extraCode: request.extraCode,
    externalChargeId: request.externalChargeId,
    totalCents: quote.totalCents,
  });
  if (quote.product.remaining !== null) quote.product.remaining -= 1;
  store.paymentsByChargeId.set(payment.externalChargeId, payment);
  store.paymentQueue.push(payment);
  // --- end of critical section ------------------------------------------------

  return { ok: true, replayed: false, payment: { ...payment } };
}

/** Recorded payments in this process, oldest first, as copies. */
export function getPaymentQueue(store: Store = getStore()): Payment[] {
  return store.paymentQueue.map((payment) => ({ ...payment }));
}
