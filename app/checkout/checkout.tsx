"use client";

import { useEffect, useRef, useState } from "react";
import {
  CART_CHANGED_MESSAGE,
  cartTotalCents,
  sameLines,
  setQty,
  subtractLines,
  type CartLine,
} from "@/lib/cart";
import { formatCents } from "@/lib/money";
import type { CheckoutAttempt, Order, PricedLine } from "@/lib/types";

export type Product = { sku: string; name: string; priceCents: number };

/**
 * The live cart is client state and can change at any time. Pressing Pay
 * asks the server to price and freeze it (an "attempt"). From then on the
 * amount shown and charged comes from that frozen attempt, never from the
 * live cart.
 */
export function Checkout({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"pay" | "complete" | null>(null);
  const orderHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (order) orderHeading.current?.focus();
  }, [order]);

  const priceOf = (sku: string) => products.find((p) => p.sku === sku)?.priceCents ?? 0;
  const qtyOf = (sku: string) => cart.find((l) => l.sku === sku)?.qty ?? 0;
  const cartChanged = attempt !== null && !sameLines(cart, attempt.lines);

  function changeQty(sku: string, qty: number) {
    setError(null);
    setCart((lines) => setQty(lines, sku, qty));
  }

  async function pay() {
    setError(null);
    if (cart.length === 0) {
      setError("Add an item before paying");
      return;
    }
    setBusy("pay");
    try {
      const res = await fetch("/api/checkout/begin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: cart.map(({ sku, qty }) => ({ sku, qty })) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAttempt(await res.json());
      setOrder(null);
    } catch {
      setError("Could not start the payment. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    if (!attempt) return;
    setError(null);
    setBusy("complete");
    try {
      const res = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.attemptId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const placed: Order = await res.json();
      setOrder(placed);
      setAttempt(null);
      setCart((lines) => subtractLines(lines, placed.lines));
    } catch {
      setError("Could not complete the payment. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 grid gap-8">
      <section aria-labelledby="products-heading">
        <h2 id="products-heading" className="text-xl font-semibold">
          Products
        </h2>
        <ul className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
          {products.map((product) => {
            const qty = qtyOf(product.sku);
            return (
              <li key={product.sku} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{product.name}</span>{" "}
                  <span className="text-stone-700">{formatCents(product.priceCents)}</span>
                </span>
                {qty === 0 ? (
                  <button
                    type="button"
                    aria-label={`Add ${product.name}`}
                    onClick={() => changeQty(product.sku, 1)}
                    className="rounded border border-stone-500 px-3 py-1"
                  >
                    Add
                  </button>
                ) : (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${product.name}`}
                      onClick={() => changeQty(product.sku, qty - 1)}
                      className="h-8 w-8 rounded border border-stone-500"
                    >
                      −
                    </button>
                    <label htmlFor={`qty-${product.sku}`} className="sr-only">
                      Quantity of {product.name}
                    </label>
                    <output id={`qty-${product.sku}`} className="min-w-6 text-center">
                      {qty}
                    </output>
                    <button
                      type="button"
                      aria-label={`Increase ${product.name}`}
                      onClick={() => changeQty(product.sku, qty + 1)}
                      className="h-8 w-8 rounded border border-stone-500"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => changeQty(product.sku, 0)}
                      className="ml-2 underline underline-offset-4"
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-lg">
          <label htmlFor="cart-total" className="font-medium">
            Cart total
          </label>{" "}
          <output id="cart-total">{formatCents(cartTotalCents(cart, priceOf))}</output>
        </p>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={pay}
            disabled={busy !== null}
            className="rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-60"
          >
            Pay
          </button>
        </div>
        <div role="alert" className="mt-2 text-red-700">
          {error}
        </div>
      </section>

      {attempt && (
        <section aria-labelledby="attempt-heading" className="rounded border border-stone-400 p-4">
          <h2 id="attempt-heading" className="text-xl font-semibold">
            Payment in progress
          </h2>
          <Lines lines={attempt.lines} />
          <p className="mt-3 text-lg">
            <label htmlFor="amount-due" className="font-medium">
              Amount due
            </label>{" "}
            <output id="amount-due">{formatCents(attempt.amountCents)}</output>
          </p>
          <p role="status" className="mt-2 font-medium text-amber-900">
            {cartChanged ? CART_CHANGED_MESSAGE : ""}
          </p>
          <button
            type="button"
            onClick={complete}
            disabled={busy !== null}
            className="mt-3 rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-60"
          >
            Complete payment
          </button>
        </section>
      )}

      {order && (
        <section aria-labelledby="order-heading" className="rounded border border-green-700 p-4">
          <h2 id="order-heading" ref={orderHeading} tabIndex={-1} className="text-xl font-semibold">
            Order placed
          </h2>
          <Lines lines={order.lines} />
          <p className="mt-3 text-lg">
            <label htmlFor="amount-charged" className="font-medium">
              Amount charged
            </label>{" "}
            <output id="amount-charged">{formatCents(order.amountCents)}</output>
          </p>
          <p className="mt-1 text-sm text-stone-700">Order {order.orderId}</p>
        </section>
      )}
    </div>
  );
}

function Lines({ lines }: { lines: PricedLine[] }) {
  return (
    <ul className="mt-3 space-y-1">
      {lines.map((line) => (
        <li key={line.sku}>
          {line.name} × {line.qty}, {formatCents(line.unitPriceCents)} each
        </li>
      ))}
    </ul>
  );
}
