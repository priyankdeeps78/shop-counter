# Architecture

Next.js 16.4 (App Router) with **Cache Components** and Partial Prefetching on. All data lives in one in-memory store (`lib/store.ts`) kept on `globalThis`. Next bundles each route on its own, and a plain module variable could end up as one copy per bundle, so the store has to live on `globalThis` to be shared.

## Server and client, per route

| Route | Server | Client | Why |
| --- | --- | --- | --- |
| `/shop` | Static shell (heading). The results section sits behind `<Suspense>`: it awaits `searchParams`, calls `getCatalog()`, filters and sorts, and renders the list. | `ShopControls` writes Search and Sort to the URL. | The URL is the state. Filtering on the server means `/shop?q=sto&sort=price-desc` comes back as filtered HTML, before any JavaScript runs. |
| `/shop/[sku]` | The whole page, prerendered for all 5 skus (`generateStaticParams`), title and description included. | Nothing. | Every part comes from the cached catalogue. `ensureStatic = 'navigation'` fails the build if request-time work creeps in. It also makes an unknown sku wait for its full render, so `notFound()` runs before streaming starts and the response is a real **HTTP 404**. A 404 thrown inside a streamed boundary would go out as 200. |
| `/desk` | Static shell. The **Payment queue** is a request-time server component (`connection()`) behind `<Suspense>`. | The form (react-hook-form). | The form needs interaction. The queue is this process's live list, so caching it would be wrong. After a recorded payment the form calls `router.refresh()`. That re-renders the queue and clears this tab's client router cache, so shop pages don't come back stale. |
| `/checkout` | Product names and prices from the cached catalogue, so the page is static. | The cart, plus the Pay and Complete flow. | The cart is per-visitor browser state. The prices shown are for display only, because the server prices the cart again. |
| `/api/*` | Route handlers. The two `GET`s call `connection()` so the build does not prerender them. | — | — |

## Caching the shop pages

`getCatalog()` (`lib/catalog.ts`) is a `'use cache'` function with `cacheTag('catalog')` and `cacheLife('max')`. The read counter is incremented inside its body, so it only counts real executions. Pages that use it are prerendered with the data in place, and Next attaches the `catalog` tag to those pages too.

**Freshness after a payment.** When `POST /api/payments` creates a payment (not on a replay, a 400 or a 409), it calls `revalidateTag('catalog', { expire: 0 })`. That expires both the data entry and every prerendered page that used it. The next request for `/shop` or `/shop/<sku>` blocks on one fresh `getCatalog()` call, and that result then serves every page. I picked `{ expire: 0 }` over the two other options:
- `'max'` is stale-while-revalidate: the first request after a payment would still get the old stock, and the brief says the *next* request must show the new count.
- `updateTag` only works inside Server Actions, and the brief asks for a route handler.

**Why no timer.** `cacheLife('max')` means time-based refresh is effectively off. Stock only changes through the payments route, and that route already invalidates the tag, so a timer would only re-read data we know is current. The e2e test `tests/e2e/caching.spec.ts` checks all of this against `next build && next start`. Repeat requests leave `catalogReads` unchanged. After a payment, the next request shows the new stock, then requests go back to cache hits.

**The URL search.** Reading `searchParams` on the server is request-time work, so `/shop?q=…` can't be a single static file. The options I considered:
1. Filter on the client with `useSearchParams` over a fully static list. The page stays static, but the server HTML for `?q=sto` would list all five items until hydration. That breaks "loading the URL directly shows only Cedar stool" for crawlers, slow devices and no-JS.
2. Render the page dynamically with no cache. Correct, but every request runs `getCatalog()`, which fails the first caching requirement.
3. **Chosen:** Partial Prerendering. The static shell is served straight away. The dynamic hole renders per request, but it does an in-memory filter over **cached** data. Rendering happens per request; the catalogue read does not.

I didn't cache the filtered output per `(q, sort)`. The cache key would come from free text the user types, so the cache would grow without bound, and filtering five items costs nothing.

On the client, `ShopControls` pushes one history entry per settled change, debounced 300 ms, so Back walks through earlier filters. Its fields are uncontrolled and read from the form, which is a real `GET /shop` form. Search keeps working without JavaScript, and text typed before hydration is kept. A controlled first version lost that text; the keyboard-only e2e test caught it.

One known gap: another tab's client router cache can show a shop page up to 5 minutes old during client-side navigation (`stale` from the `max` profile). A full load is always fresh.

## Why we charge the server snapshot

Pay sends sku and quantity only. `POST /api/checkout/begin` drops any client `unitPriceCents`, prices each line from the catalogue, and stores a frozen attempt. The amount the shopper agreed to is therefore fixed by the server at the moment they pressed Pay. Complete reads only `attemptId` and builds the order from that snapshot. Reasons:
- **Trust.** Prices and totals from the browser can be edited, so the client never states an amount.
- **Consent.** The shopper saw and accepted "Amount due" at Pay. A real provider would already have authorised that amount. Charging the live cart would charge something the shopper did not confirm, and it could differ from the authorisation.
- **Idempotency.** One attempt gives one order. A double-click or retry of Complete returns the same order and amount.

The cart stays editable. The UI warns when it no longer matches the snapshot. After the order, only the bought quantities leave the cart, so a pen added mid-payment is still there to buy.

## Running on several serverless instances

Every instance (and every cold start) has its own store, read counter and cache. On Vercel I'd expect this:
- Stock differs per instance. A payment on instance A decrements only A's copy, so `/api/catalog` on B still says 5. Each instance can sell its own 2 stools, so **overselling**.
- **Replays are not safe.** A retried `ch_…` that lands on another instance is recorded and decremented a second time.
- **Checkout breaks.** If `begin` runs on A and `complete` on B, the answer is `404 attempt_not_found`.
- The desk queue shows a different list depending on which instance answers, and it empties on cold start. `catalogReads` is per instance and means little.
- Cached pages can lie. Vercel shares the page cache and tag invalidation across instances, but whichever instance re-renders uses its own store. The build-time prerender was made from the build machine's seed data.

What I would use instead: Postgres, as the single source of truth.
- Decrement with `UPDATE items SET remaining = remaining - 1 WHERE sku = $1 AND remaining > 0 RETURNING remaining`, which can't oversell.
- Make `payments.external_charge_id` UNIQUE and insert with `ON CONFLICT DO NOTHING` (then select the original), so replays are safe across instances.
- Keep `attempts` and `orders` tables, with `orders.attempt_id` UNIQUE.

The `'use cache'` + tag design stays as it is, with a shared cache handler (Vercel's built-in one, or Redis via `cacheHandlers` when self-hosting). The counter would become a metric. The take-home deliberately does none of this.

## Accessibility: what I checked and how

- **Structure.** Header, nav and main landmarks, a skip link, and one `h1` per page. Sections are named by their headings (**Payment preview**, **Payment queue**, **Payment in progress**, **Order placed**), so they show up as named regions.
- **Labels.** Every field has a visible `<label>`. Amounts are `<output>` elements tied to a `<label>`, so "Cart total", "Amount due" and "Amount charged" are programmatically labelled. Quantity buttons are named per item ("Increase Gel pen"). Accessible names start with the visible text ("Add …"), which covers WCAG 2.5.3 *label in name*.
- **Errors.** Fields get `aria-invalid`, and `aria-describedby` points at their message. Focus moves to the first invalid field, including for errors that come back from the server. Field errors come from the same `validatePayment` both client and server use, so the two always agree.
- **Announcements.** The desk outcome and the "cart changed" message are `role="status"`. The empty-cart error is `role="alert"`. `/shop` announces the result count. After Complete, focus moves to the **Order placed** heading.
- **Keyboard.** All controls are native elements. `:focus-visible` gives a visible outline everywhere.
- **How I checked:**
  - axe-core (`tests/e2e/a11y.spec.ts`, WCAG 2.0–2.2 A/AA rules, including contrast) runs on every page and in interactive states: desk with errors, desk with a preview, checkout mid-payment, and the placed order.
  - The RTL and Playwright tests query by role and accessible name, so a missing label fails a test.
  - A keyboard-only Playwright test covers the skip link and searching with Enter.
- **Not done yet:** a full manual keyboard pass of every page, and testing with a real screen reader (VoiceOver or NVDA). Automated tools catch only part of the issues, so those are the next checks I'd make.
