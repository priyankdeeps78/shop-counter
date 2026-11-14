"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { PanelHeading } from "@/components/workspace-panel";
import { ProductImage } from "@/features/catalog/components/product-image";
import { cartReducer, cartTotalCents, matchesSnapshot, type CartAction } from "@/features/checkout/lib/cart";
import { formatMoney } from "@/lib/format-money";
import { postJson } from "@/lib/post-json";
import type { CheckoutAttempt, CheckoutSku, Order, SnapshotLine } from "@/types/domain";

export type CheckoutProduct = { sku: CheckoutSku; name: string; priceCents: number };

export const EMPTY_CART_MESSAGE = "Add an item before paying";
export const CART_CHANGED_MESSAGE =
  "Your cart changed after payment started. You will be charged the amount below.";

const stepButtonClass = "button button-secondary cart-step";

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
  const [pending, setPending] = useState<"begin" | "complete" | null>(null);

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

  const unitPrice = Object.fromEntries(products.map((product) => [product.sku, product.priceCents])) as Record<CheckoutSku, number>;
  const qtyOf = (sku: CheckoutSku) => cart.find((line) => line.sku === sku)?.qty ?? 0;
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartChanged = attempt !== null && !matchesSnapshot(cart, attempt.lines);

  function update(action: CartAction & { sku: CheckoutSku }, focusId: string | null) {
    focusAfterUpdate.current = focusId;
    setMessage(null);
    dispatch(action);
  }

  async function pay() {
    if (pending) return;
    if (cart.length === 0) {
      setMessage(EMPTY_CART_MESSAGE);
      return;
    }
    setPending("begin");
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
      setPending(null);
    }
  }

  async function completePayment() {
    if (!attempt || pending) return;
    setPending("complete");
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
      setPending(null);
    }
  }

  return (
    <div className="checkout-grid">
      <section className="surface-panel workspace-panel checkout-items" aria-labelledby="checkout-items-heading">
        <PanelHeading id="checkout-items-heading" icon="+">Items for sale</PanelHeading>
        <ul aria-label="Items for sale" className="checkout-item-list">
            {products.map((product) => {
              const qty = qtyOf(product.sku);
              const id = (control: string) => `${product.sku}-${control}`;
              return (
                <li key={product.sku} className="checkout-row">
                  <div className="cart-product">
                    <ProductImage sku={product.sku} className="cart-thumb" />
                    <div>
                      <p className="cart-product-name">{product.name}</p>
                      <p className="text-sm text-muted">{formatMoney(product.priceCents)}</p>
                    </div>
                  </div>
                  {qty === 0 ? (
                    <button
                      id={id("add")}
                      type="button"
                      aria-label={`Add ${product.name}`}
                      className="button button-secondary cart-add"
                      onClick={() => update({ type: "add", sku: product.sku }, id("increase"))}
                    >
                      Add
                    </button>
                  ) : (
                    <div role="group" aria-label={`${product.name} in cart`} className="cart-controls">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name}`}
                        className={stepButtonClass}
                        onClick={() =>
                          update({ type: "decrease", sku: product.sku }, qty === 1 ? id("add") : null)
                        }
                      >
                        −
                      </button>
                      <span className="min-w-12 text-center text-xs tabular-nums">
                        Qty <output aria-label={`${product.name} quantity`}>{qty}</output>
                      </span>
                      <button
                        id={id("increase")}
                        type="button"
                        aria-label={`Increase ${product.name}`}
                        className={stepButtonClass}
                        onClick={() => update({ type: "increase", sku: product.sku }, null)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        className="button button-quiet"
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
      </section>

      <div className="checkout-side">
        <section className="surface-panel workspace-panel cart-summary" aria-labelledby="cart-summary-heading">
          <PanelHeading
            id="cart-summary-heading"
            icon="▤"
            aside={<span className="workspace-tag">{itemCount} {itemCount === 1 ? "item" : "items"}</span>}
          >
            Cart summary
          </PanelHeading>
          <div className="cart-summary-content">
            {cart.length === 0 ? (
              <p className="cart-empty">Your cart is empty. Add an item to get started.</p>
            ) : (
              <ul className="cart-summary-lines" aria-label="Live cart">
                {cart.map(({ sku, qty }) => {
                  const name = products.find((product) => product.sku === sku)?.name ?? sku;
                  return (
                    <li key={sku}>
                      <span>{name} × {qty}</span>
                      <span>{formatMoney(unitPrice[sku] * qty)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="summary-total">
              <span id="cart-total-label" className="font-medium">Cart total</span>
              <output aria-labelledby="cart-total-label" className="display summary-price">
                {formatMoney(cartTotalCents(cart, unitPrice))}
              </output>
            </p>
            <button type="button" className="button button-primary" disabled={Boolean(pending)} onClick={pay}>
              {pending === "begin" ? <span className="button-label is-working">Starting payment…</span> : "Pay"}
            </button>
            <p role="status" className="checkout-message text-sm font-medium text-red-700">
              {message}
            </p>
          </div>
        </section>

        {attempt && (
          <section
            aria-labelledby="payment-progress-heading"
            className="surface-panel workspace-panel checkout-receipt enter"
          >
            <PanelHeading id="payment-progress-heading" icon="▤" headingRef={progressHeading}>
              Payment in progress
            </PanelHeading>
            <div className="receipt-content">
              <SnapshotLines lines={attempt.lines} />
              <p className="summary-total">
                <span id="amount-due-label">Amount due</span>{" "}
                <output aria-labelledby="amount-due-label" className="display summary-price">
                  {formatMoney(attempt.amountCents)}
                </output>
              </p>
              <p role="status" className="checkout-alert">
                {cartChanged ? CART_CHANGED_MESSAGE : ""}
              </p>
              <button type="button" className="button button-primary" disabled={Boolean(pending)} onClick={completePayment}>
                {pending === "complete" ? <span className="button-label is-working">Completing payment…</span> : "Complete payment"}
              </button>
            </div>
          </section>
        )}

        {order && (
          <section aria-labelledby="order-heading" className="surface-panel workspace-panel checkout-receipt order-receipt enter">
            <PanelHeading id="order-heading" icon="✓" headingRef={orderHeading}>Order placed</PanelHeading>
            <div className="receipt-content">
              <SnapshotLines lines={order.lines} />
              <p className="summary-total">
                <span id="amount-charged-label">Amount charged</span>{" "}
                <output aria-labelledby="amount-charged-label" className="display summary-price">
                  {formatMoney(order.amountCents)}
                </output>
              </p>
              <p className="order-id text-sm text-muted">Order {order.orderId}</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SnapshotLines({ lines }: { lines: readonly Readonly<SnapshotLine>[] }) {
  return (
    <ul className="receipt-lines space-y-1">
      {lines.map((line) => (
        <li key={line.sku}>
          {line.name} × {line.qty} — {formatMoney(line.unitPriceCents * line.qty)}
        </li>
      ))}
    </ul>
  );
}
