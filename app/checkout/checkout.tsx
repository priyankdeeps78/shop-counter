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
import { ItemArt } from "@/components/item-art";
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

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section aria-labelledby="products-heading" className="card overflow-hidden">
        <h2 id="products-heading" className="border-b border-line px-6 py-4 font-display text-2xl font-semibold">
          Products
        </h2>
        <ul className="divide-y divide-line">
          {products.map((product) => {
            const qty = qtyOf(product.sku);
            return (
              <li key={product.sku} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <ItemArt sku={product.sku} className="h-16 w-16 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{product.name}</span>
                  <span className="text-sm text-muted">{formatCents(product.priceCents)} each</span>
                </span>
                {qty === 0 ? (
                  <button
                    type="button"
                    aria-label={`Add ${product.name}`}
                    onClick={() => changeQty(product.sku, 1)}
                    className="btn-secondary px-4 py-2"
                  >
                    <span aria-hidden="true">+</span> Add
                  </button>
                ) : (
                  <span className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-line-strong bg-white p-1">
                      <button
                        type="button"
                        aria-label={`Decrease ${product.name}`}
                        onClick={() => changeQty(product.sku, qty - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none transition hover:bg-paper"
                      >
                        −
                      </button>
                      <label htmlFor={`qty-${product.sku}`} className="sr-only">
                        Quantity of {product.name}
                      </label>
                      <output id={`qty-${product.sku}`} className="min-w-8 text-center font-semibold tabular-nums">
                        {qty}
                      </output>
                      <button
                        type="button"
                        aria-label={`Increase ${product.name}`}
                        onClick={() => changeQty(product.sku, qty + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none transition hover:bg-paper"
                      >
                        +
                      </button>
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => changeQty(product.sku, 0)}
                      className="text-sm font-semibold text-clay underline-offset-4 hover:underline"
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:sticky lg:top-24">
        <section aria-labelledby="basket-heading" className="card p-6">
          <h2 id="basket-heading" className="font-display text-2xl font-semibold">
            Your basket
          </h2>
          <p className="mt-1 text-sm text-muted">
            {cartCount === 0 ? "Nothing in it yet." : `${cartCount} ${cartCount === 1 ? "item" : "items"}`}
          </p>
          <p className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <label htmlFor="cart-total" className="font-semibold">
              Cart total
            </label>
            <output id="cart-total" className="font-display text-3xl font-semibold tabular-nums">
              {formatCents(cartTotalCents(cart, priceOf))}
            </output>
          </p>
          <button
            type="button"
            onClick={pay}
            disabled={busy !== null}
            className="btn-primary mt-5 w-full py-3 text-base"
          >
            {busy === "pay" ? "Starting…" : "Pay"}
          </button>
          <div role="alert" className={error ? "mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" : ""}>
            {error}
          </div>
        </section>

        {attempt && (
          <section aria-labelledby="attempt-heading" className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-line-strong bg-honey-soft/60 px-6 py-4">
              <h2 id="attempt-heading" className="font-display text-xl font-semibold">
                Payment in progress
              </h2>
              <span className="pill bg-honey-soft text-honey-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                Awaiting
              </span>
            </div>
            <div className="px-6 pb-6">
              <Lines lines={attempt.lines} />
              <p className="flex items-baseline justify-between border-t border-line pt-4">
                <label htmlFor="amount-due" className="font-semibold">
                  Amount due
                </label>
                <output id="amount-due" className="font-display text-3xl font-semibold tabular-nums">
                  {formatCents(attempt.amountCents)}
                </output>
              </p>
              <p
                role="status"
                className={
                  cartChanged
                    ? "mt-4 rounded-xl border border-honey-ink/25 bg-honey-soft px-4 py-3 text-sm font-medium text-honey-ink"
                    : "sr-only"
                }
              >
                {cartChanged ? CART_CHANGED_MESSAGE : ""}
              </p>
              <button
                type="button"
                onClick={complete}
                disabled={busy !== null}
                className="btn-primary mt-5 w-full py-3 text-base"
              >
                {busy === "complete" ? "Charging…" : "Complete payment"}
              </button>
            </div>
          </section>
        )}

        {order && (
          <section aria-labelledby="order-heading" className="card overflow-hidden border-moss/40">
            <div className="flex items-center gap-3 bg-moss px-6 py-4 text-white">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
                <circle cx="12" cy="12" r="11" fill="#fffcf6" />
                <path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="var(--color-moss)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2
                id="order-heading"
                ref={orderHeading}
                tabIndex={-1}
                className="font-display text-xl font-semibold focus-visible:outline-white"
              >
                Order placed
              </h2>
            </div>
            <div className="px-6 pb-6">
              <Lines lines={order.lines} />
              <p className="flex items-baseline justify-between border-t border-line pt-4">
                <label htmlFor="amount-charged" className="font-semibold">
                  Amount charged
                </label>
                <output id="amount-charged" className="font-display text-3xl font-semibold tabular-nums">
                  {formatCents(order.amountCents)}
                </output>
              </p>
              <p className="mt-3 text-xs text-muted">
                Order <code className="font-mono">{order.orderId.slice(0, 8)}</code>
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Lines({ lines }: { lines: PricedLine[] }) {
  return (
    <ul className="my-4 space-y-2 text-sm">
      {lines.map((line) => (
        <li key={line.sku} className="flex items-baseline justify-between gap-4">
          <span>
            <span className="font-medium">
              {line.name} × {line.qty}
            </span>
            <span className="text-muted">, {formatCents(line.unitPriceCents)} each</span>
          </span>
          <span className="tabular-nums">{formatCents(line.unitPriceCents * line.qty)}</span>
        </li>
      ))}
    </ul>
  );
}
