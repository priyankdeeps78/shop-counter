import { SEED_CATALOG } from "./seed";
import type { CatalogItem, CheckoutAttempt, Order, Payment, PricedLine } from "./types";
import type { ValidPayment } from "./payments/validate-payment";

/**
 * In-memory store for one server process.
 *
 * It hangs off `globalThis` because Next.js bundles each route separately: a
 * plain module-level variable can end up as one copy per route bundle, so the
 * payments route and the shop pages would not see the same stock. One object
 * on `globalThis` is shared by everything in the process.
 *
 * Every mutation below is synchronous (no `await` between the check and the
 * write), so two requests can never interleave inside one, and stock cannot go
 * below zero in a single process.
 */
type State = {
  items: Map<string, CatalogItem>;
  payments: Payment[];
  paymentsByChargeId: Map<string, Payment>;
  attempts: Map<string, CheckoutAttempt>;
  ordersByAttemptId: Map<string, Order>;
  catalogReads: number;
};

function freshState(): State {
  return {
    items: new Map(SEED_CATALOG.map((item) => [item.sku, structuredClone(item)])),
    payments: [],
    paymentsByChargeId: new Map(),
    attempts: new Map(),
    ordersByAttemptId: new Map(),
    catalogReads: 0,
  };
}

const globalKey = Symbol.for("shop-counter.store");
type GlobalWithStore = typeof globalThis & { [globalKey]?: State };

function state(): State {
  const g = globalThis as GlobalWithStore;
  g[globalKey] ??= freshState();
  return g[globalKey];
}

/** Test helper: put the store back to the seed data. */
export function resetStore(): void {
  (globalThis as GlobalWithStore)[globalKey] = freshState();
}

// ---------------------------------------------------------------- catalogue

/** Live copy of the catalogue. Callers get clones, never the stored objects. */
export function readCatalog(): CatalogItem[] {
  return [...state().items.values()].map((item) => structuredClone(item));
}

export function findItem(sku: string): CatalogItem | undefined {
  const item = state().items.get(sku);
  return item ? structuredClone(item) : undefined;
}

export function countCatalogRead(): void {
  state().catalogReads += 1;
}

export function catalogReads(): number {
  return state().catalogReads;
}

// ----------------------------------------------------------------- payments

export type PaymentQuote = {
  itemName: string;
  extraName: string | null;
  totalCents: number;
  remaining: number | null;
};

/** Prices a validated desk payment against live stock. Writes nothing. */
export function quotePayment(value: ValidPayment): PaymentQuote {
  const item = state().items.get(value.sku);
  if (!item) throw new Error(`Unknown sku ${value.sku}`);
  const extra = value.extraCode
    ? item.extras.find((e) => e.code === value.extraCode)
    : undefined;
  return {
    itemName: item.name,
    extraName: extra?.name ?? null,
    totalCents: item.priceCents + (extra?.priceCents ?? 0),
    remaining: item.remaining,
  };
}

export type RecordResult =
  | { status: "created"; payment: Payment }
  | { status: "replayed"; payment: Payment }
  | { status: "sold_out" };

/**
 * Records a payment exactly once per external charge id.
 *
 * Order matters: the replay check runs before the stock check, so retrying
 * the charge that bought the last lamp still answers with that payment
 * instead of "Sold out".
 */
export function recordPayment(value: ValidPayment): RecordResult {
  const s = state();
  const existing = s.paymentsByChargeId.get(value.externalChargeId);
  if (existing) return { status: "replayed", payment: { ...existing } };

  const item = s.items.get(value.sku);
  if (!item) throw new Error(`Unknown sku ${value.sku}`);
  if (item.remaining !== null && item.remaining <= 0) return { status: "sold_out" };

  const quote = quotePayment(value);
  const payment: Payment = {
    email: value.email,
    sku: value.sku,
    itemName: quote.itemName,
    extraCode: value.extraCode,
    externalChargeId: value.externalChargeId,
    totalCents: quote.totalCents,
  };
  if (item.remaining !== null) item.remaining -= 1;
  s.payments.push(payment);
  s.paymentsByChargeId.set(payment.externalChargeId, payment);
  return { status: "created", payment: { ...payment } };
}

export function listPayments(): Payment[] {
  return state().payments.map((p) => ({ ...p }));
}

// ----------------------------------------------------------------- checkout

/** Stores a priced snapshot of the cart. The stored attempt is frozen. */
export function createAttempt(lines: PricedLine[]): CheckoutAttempt {
  const attempt: CheckoutAttempt = deepFreeze({
    attemptId: crypto.randomUUID(),
    lines: lines.map((l) => ({ ...l })),
    amountCents: lines.reduce((sum, l) => sum + l.unitPriceCents * l.qty, 0),
  });
  state().attempts.set(attempt.attemptId, attempt);
  return structuredClone(attempt);
}

/**
 * Turns an attempt into an order, once. Completing the same attempt again
 * returns the order created the first time.
 */
export function completeAttempt(attemptId: string): Order | undefined {
  const s = state();
  const existing = s.ordersByAttemptId.get(attemptId);
  if (existing) return structuredClone(existing);

  const attempt = s.attempts.get(attemptId);
  if (!attempt) return undefined;

  const order: Order = deepFreeze({
    orderId: crypto.randomUUID(),
    ...structuredClone(attempt),
  });
  s.ordersByAttemptId.set(attemptId, order);
  return structuredClone(order);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
