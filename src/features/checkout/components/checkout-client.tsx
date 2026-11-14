"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { cartReducer, cartTotalCents, matchesSnapshot, type CartAction } from "@/features/checkout/lib/cart";
import { formatMoney } from "@/lib/format-money";
import { postJson } from "@/lib/post-json";
import type { CheckoutAttempt, CheckoutSku, Order, SnapshotLine } from "@/types/domain";

export type CheckoutProduct = { sku: CheckoutSku; name: string; priceCents: number };

export const EMPTY_CART_MESSAGE = "Add an item before paying";
export const CART_CHANGED_MESSAGE =
  "Your cart changed after payment started. You will be charged the amount below.";

const buttonClass = "rounded-md border border-foreground px-3 py-1.5 font-medium disabled:opacity-50";
const primaryButtonClass = "rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50";

/**
 * The live cart (editable at all times) and the payment attempt (a frozen server
 * snapshot taken at Pay) are separate state. Amount due and the order come only
 * from the snapshot; Cart total comes only from the live cart.
 */
export function CheckoutClient({ products }: { products: readonly CheckoutProduct[] }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Keeps keyboard focus on a sensible control when buttons swap (Add ↔ quantity).
  const focusAfterUpdate = useRef<string | null>(null);
  const progressHeading = useRef<HTMLHeadingElement>(null);
  const orderHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusAfterUpdate.current) document.getElementById(focusAfterUpdate.current)?.focus();
    focusAfterUpdate.current = null;
  }, [cart]);
  useEffect(() => {
    if (attempt) progressHeading.current?.focus();
  }, [attempt]);
  useEffect(() => {
    if (order) orderHeading.current?.focus();
  }, [order]);

  const unitPrice = Object.fromEntries(products.map((p) => [p.sku, p.priceCents])) as Record<CheckoutSku, number>;
  const qtyOf = (sku: CheckoutSku) => cart.find((line) => line.sku === sku)?.qty ?? 0;
  const cartChanged = attempt !== null && !matchesSnapshot(cart, attempt.lines);

  function update(action: CartAction & { sku: CheckoutSku }, focusId: string | null) {
    focusAfterUpdate.current = focusId;
    setMessage(null);
    dispatch(action);
  }

  async function pay() {
    if (cart.length === 0) {
      setMessage(EMPTY_CART_MESSAGE);
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const body = await postJson<CheckoutAttempt | { error: string }>("/api/checkout/begin", {
        lines: cart.map(({ sku, qty }) => ({ sku, qty })),
      });
      if (!("attemptId" in body)) throw new Error(body.error);
      setOrder(null);
      setAttempt(body);
    } catch {
      setMessage("Could not start the payment. Nothing was charged. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function completePayment() {
    if (!attempt) return;
    setPending(true);
    setMessage(null);
    try {
      // Only the attempt id: the server builds the order from its stored snapshot.
      const body = await postJson<Order | { error: string }>("/api/checkout/complete", {
        attemptId: attempt.attemptId,
      });
      if (!("orderId" in body)) throw new Error(body.error);
      setOrder(body);
      setAttempt(null);
      dispatch({ type: "clear" });
    } catch {
      setMessage("Could not complete the payment. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <ul aria-label="Items for sale" className="divide-y divide-border rounded-lg border border-border bg-surface">
        {products.map((product) => {
          const qty = qtyOf(product.sku);
          const id = (control: string) => `${product.sku}-${control}`;
          return (
            <li key={product.sku} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-muted">{formatMoney(product.priceCents)}</p>
              </div>
              {qty === 0 ? (
                <button
                  id={id("add")}
                  type="button"
                  aria-label={`Add ${product.name}`}
                  className={buttonClass}
                  onClick={() => update({ type: "add", sku: product.sku }, id("increase"))}
                >
                  Add
                </button>
              ) : (
                <div role="group" aria-label={`${product.name} in cart`} className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease ${product.name}`}
                    className={buttonClass}
                    onClick={() =>
                      update({ type: "decrease", sku: product.sku }, qty === 1 ? id("add") : null)
                    }
                  >
                    −
                  </button>
                  <span className="min-w-16 text-center">
                    Qty <output aria-label={`${product.name} quantity`}>{qty}</output>
                  </span>
                  <button
                    id={id("increase")}
                    type="button"
                    aria-label={`Increase ${product.name}`}
                    className={buttonClass}
                    onClick={() => update({ type: "increase", sku: product.sku }, null)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name}`}
                    className={buttonClass}
                    onClick={() => update({ type: "remove", sku: product.sku }, id("add"))}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-4">
        <p className="text-lg">
          <span id="cart-total-label">Cart total</span>{" "}
          <output aria-labelledby="cart-total-label" className="font-semibold">
            {formatMoney(cartTotalCents(cart, unitPrice))}
          </output>
        </p>
        <button type="button" className={primaryButtonClass} disabled={pending} onClick={pay}>
          Pay
        </button>
        <p role="status" className="text-sm font-medium text-red-700">
          {message}
        </p>
      </div>

      {attempt && (
        <section
          aria-labelledby="payment-progress-heading"
          className="space-y-3 rounded-lg border border-border bg-surface p-4"
        >
          <h2 id="payment-progress-heading" ref={progressHeading} tabIndex={-1} className="text-lg font-semibold">
            Payment in progress
          </h2>
          <SnapshotLines lines={attempt.lines} />
          <p>
            <span id="amount-due-label">Amount due</span>{" "}
            <output aria-labelledby="amount-due-label" className="font-semibold">
              {formatMoney(attempt.amountCents)}
            </output>
          </p>
          <p role="status" className="text-sm font-medium">
            {cartChanged ? CART_CHANGED_MESSAGE : ""}
          </p>
          <button type="button" className={primaryButtonClass} disabled={pending} onClick={completePayment}>
            Complete payment
          </button>
        </section>
      )}

      {order && (
        <section aria-labelledby="order-heading" className="space-y-3 rounded-lg border border-border bg-surface p-4">
          <h2 id="order-heading" ref={orderHeading} tabIndex={-1} className="text-lg font-semibold">
            Order placed
          </h2>
          <SnapshotLines lines={order.lines} />
          <p>
            <span id="amount-charged-label">Amount charged</span>{" "}
            <output aria-labelledby="amount-charged-label" className="font-semibold">
              {formatMoney(order.amountCents)}
            </output>
          </p>
          <p className="text-sm text-muted">Order {order.orderId}</p>
        </section>
      )}
    </div>
  );
}

function SnapshotLines({ lines }: { lines: readonly Readonly<SnapshotLine>[] }) {
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line.sku}>
          {line.name} × {line.qty} — {formatMoney(line.unitPriceCents * line.qty)}
        </li>
      ))}
    </ul>
  );
}
