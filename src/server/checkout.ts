import "server-only";
import { z } from "zod";
import { getStore, type Store } from "@/server/store";
import { CHECKOUT_SKUS, type CheckoutAttempt, type Order, type SnapshotLine } from "@/types/domain";

/**
 * What the client may choose: which checkout items and how many. Anything else
 * on a line (such as `unitPriceCents`) is dropped. `.int()` in Zod 4 accepts
 * only safe integers, so `qty` is a positive safe integer.
 */
const beginCheckoutSchema = z.object({
  lines: z
    .array(z.object({ sku: z.enum(CHECKOUT_SKUS), qty: z.number().int().min(1) }))
    .min(1)
    // Each item at most once; the checkout page never sends duplicates.
    .refine((lines) => new Set(lines.map((line) => line.sku)).size === lines.length),
});

export type BeginOutcome = { ok: true; attempt: CheckoutAttempt } | { ok: false };

/**
 * Starts a checkout attempt: prices every line from the live store (never from
 * the client), totals it in integer cents, and stores a frozen snapshot under a
 * new attempt id. Any invalid cart — unknown or non-checkout sku, qty below 1 or
 * not a safe integer, empty or missing `lines`, a repeated sku, a malformed body,
 * or a total too large to be exact — stores nothing.
 */
export function beginCheckout(
  input: unknown,
  store: Store = getStore(),
  newAttemptId: () => string = () => crypto.randomUUID(),
): BeginOutcome {
  const parsed = beginCheckoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const lines: Readonly<SnapshotLine>[] = [];
  for (const { sku, qty } of parsed.data.lines) {
    const product = store.products.get(sku);
    if (!product) return { ok: false };
    lines.push(Object.freeze({ sku, name: product.name, unitPriceCents: product.priceCents, qty }));
  }
  const amountCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0);
  if (!Number.isSafeInteger(amountCents)) return { ok: false };

  const attempt: CheckoutAttempt = Object.freeze({
    attemptId: newAttemptId(),
    lines: Object.freeze(lines),
    amountCents,
  });
  store.attemptsById.set(attempt.attemptId, attempt);
  return { ok: true, attempt };
}

/** A plain, editable copy of an attempt for a response body. */
export function attemptToJson(attempt: CheckoutAttempt) {
  return {
    attemptId: attempt.attemptId,
    lines: attempt.lines.map((line) => ({ ...line })),
    amountCents: attempt.amountCents,
  };
}

/** Only the attempt id is read from a completion request; everything else is ignored. */
const completeCheckoutSchema = z.object({ attemptId: z.string().min(1) });

export type CompleteOutcome =
  | { ok: true; order: Order }
  | { ok: false; reason: "invalid" | "not_found" };

/**
 * Completes a checkout attempt, at most once. The order is built only from the
 * stored, frozen snapshot — never from the request (any `lines`, `amountCents`
 * or prices sent are ignored) and never from the current cart or catalogue.
 * Completing the same attempt again returns the same order (same `orderId`).
 * Synchronous from lookup to save, so it cannot interleave within this process.
 */
export function completeCheckout(
  input: unknown,
  store: Store = getStore(),
  newOrderId: () => string = () => crypto.randomUUID(),
): CompleteOutcome {
  const parsed = completeCheckoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const { attemptId } = parsed.data;

  const existing = store.ordersByAttemptId.get(attemptId);
  if (existing) return { ok: true, order: existing };

  const attempt = store.attemptsById.get(attemptId);
  if (!attempt) return { ok: false, reason: "not_found" };

  const order: Order = Object.freeze({
    orderId: newOrderId(),
    attemptId,
    lines: attempt.lines, // already frozen
    amountCents: attempt.amountCents,
  });
  store.ordersByAttemptId.set(attemptId, order);
  return { ok: true, order };
}

/** A plain, editable copy of an order for a response body. */
export function orderToJson(order: Order) {
  return {
    orderId: order.orderId,
    attemptId: order.attemptId,
    lines: order.lines.map((line) => ({ ...line })),
    amountCents: order.amountCents,
  };
}
