# Architecture

Next.js 16.4 App Router with **Cache Components** on. All state lives in one
in-memory store per server process (`src/server/store.ts`, held on `globalThis`
so route handlers and pages share it). Money is integer cents everywhere.

## Server and client, per route

| Route | Server | Client | Why |
| ----- | ------ | ------ | --- |
| `/shop` | Page and list are Server Components. The list sits in `<Suspense>` because it reads `searchParams`. | `ShopFilters` only (Search, Sort). | The list must be correct with no JavaScript and for a direct URL; only the inputs need interactivity. |
| `/shop/[sku]` | Fully server-rendered, prerendered for the five skus. | Nothing. | Static content plus stock; needs a real 404 and metadata. |
| `/desk` | Page, item list and the **Payment queue** (read per request with `connection()` inside `<Suspense>`). | `DeskForm` (React Hook Form). | The queue is live server state; the form needs field-level feedback. |
| `/checkout` | Page and product data. | `CheckoutClient` (cart in `useReducer`). | The live cart is browser state by nature; money decisions stay on the server. |
| `/api/*` | Route handlers: thin HTTP mapping over plain services in `src/server/*`. | — | Services are testable without HTTP. |

`validatePayment` (`src/features/payments/lib/payment-validation.ts`) is pure Zod
code used by both payment routes **and** the desk form's resolver, so the browser
shows exactly the server's messages. `src/proxy.ts` sends unknown `/shop/<sku>`
URLs to a path no route matches: in Next 16.4, `notFound()` thrown by a page
answers 404 but with an empty error shell that needs JavaScript; an unmatched
URL gets a fully server-rendered 404 page.

## Project structure
```text
shop-counter/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # Optional / → /shop redirect
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   ├── shop/
│   │   │   ├── page.tsx
│   │   │   └── [sku]/
│   │   │       ├── page.tsx
│   │   │       └── not-found.tsx
│   │   ├── desk/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── api/
│   │       ├── catalog/route.ts
│   │       ├── debug/reads/route.ts
│   │       ├── payments/route.ts
│   │       ├── payments/preview/route.ts
│   │       ├── checkout/begin/route.ts
│   │       └── checkout/complete/route.ts
│   ├── features/
│   │   ├── catalog/
│   │   │   ├── components/catalog-list.tsx
│   │   │   ├── components/product-card.tsx
│   │   │   ├── components/shop-filters.tsx
│   │   │   ├── components/product-details.tsx
│   │   │   └── lib/filter-catalog.ts
│   │   ├── payments/
│   │   │   ├── components/payment-form.tsx
│   │   │   ├── components/payment-preview.tsx
│   │   │   ├── components/payment-queue.tsx
│   │   │   └── lib/payment-validation.ts    # exports validatePayment
│   │   └── checkout/
│   │       ├── components/checkout-client.tsx
│   │       ├── components/payment-progress.tsx
│   │       ├── components/order-confirmation.tsx
│   │       └── lib/cart.ts
│   ├── server/
│   │   ├── store.ts                       # createStore() + process-local singleton
│   │   ├── catalog.ts                     # getLiveCatalog(), cached getCatalog()
│   │   ├── payments.ts                    # preview + record services
│   │   └── checkout.ts                    # begin + complete services
│   ├── types/domain.ts                    # shared domain types
│   └── lib/format-money.ts
├── tests/
│   ├── unit/                              # store, validation, service tests
│   ├── component/                         # RTL
│   └── e2e/                               # Playwright
├── docs/IMPLEMENTATION_PROGRESS.md
├── ARCHITECTURE.md
├── README.md
├── .nvmrc
├── next.config.ts
├── tsconfig.json
├── package.json
├── playwright.config.ts
└── vitest.config.ts
```

## Catalogue caching

### Why I chose `use cache`

The brief required two things: repeated shop requests shouldn't read the catalogue again, but stock must update immediately after a successful payment.

I considered time-based revalidation and static rendering with on-demand invalidation. I chose Next.js **`use cache` with cache tags** because I could cache the catalogue in one place and explicitly invalidate it whenever stock changed.

`getCatalog()` in `src/server/catalog.ts` uses:

- `'use cache'` to cache the result across requests.
- `cacheTag('catalog')` to identify what needs invalidation.
- `cacheLife('catalog')` to configure its lifetime.

The cache profile has a 30-day revalidation period as a fallback. I don't rely on that timer for stock updates.

The function also increments `catalogReads` only when its body actually executes. Returning a cached result doesn't increment the counter. The `/api/catalog` endpoint uses the uncached `getLiveCatalog()` instead.

**Freshness:** a *new* payment calls `revalidateTag('catalog', { expire: 0 })`
from the route handler (`updateTag` is for Server Actions only). `expire: 0`
means no stale copy is served: the next request for any shop page, including the
prerendered item pages, blocks on one fresh `getCatalog()` run. Replays, previews
and rejected payments do not invalidate.

**URL search:** `q` and `sort` are applied *after* the cached read, so every URL
shares one cache entry; only the small list renders per request. Measured on
`next start`: the first runtime request costs one read, then repeats across all
URLs cost none; after a payment the first request to `/shop` and `/shop/<sku>`
shows the new stock, for exactly one more read.

Two settings came from evidence, not defaults: `partialPrefetching: false`
(with it on, an unknown sku answered 200 and the first request after an expiry
was stale), and `router.refresh()` after a desk payment, so browser Back to a page
seen before the payment shows the new stock. A payment made from another browser
cannot refresh *this* browser's history cache; a reload or navigation does.

## Why the charge is the server snapshot

Pay sends only `{ sku, qty }`. The server prices each line from its own catalogue
(any `unitPriceCents` is dropped), stores a frozen attempt, and returns it.
Complete payment sends only the `attemptId`; the order is built from that stored
snapshot, never from the request or the current cart, and completing again
returns the same order. The client can edit the cart freely after Pay without
changing what is charged; the page shows the difference (`Amount due` vs
`Cart total` and the "cart changed" message) instead of silently re-pricing.
Prices and totals that come from the browser could be stale or forged.


### Local vs production: Payment queue

One thing I noticed while testing was that the **Payment queue worked correctly on my local server but behaved differently after deploying to Vercel**.

Locally, whenever I recorded a payment, it immediately appeared in the queue. But in production, I noticed that a payment could be recorded successfully and still not appear in the queue when I refreshed the page.

After looking into it, I realised this was because of how the in-memory store works. Locally, the application runs in a single server process, so both recording a payment and fetching the queue use the same memory.

On Vercel, requests can be handled by different serverless instances. A payment might be saved in one instance, while the next request to load the queue goes to another instance with its own empty store.

This also means stock counts and checkout attempts may behave inconsistently in production.

For a real application, I would use a shared database so every instance reads and writes the same data. However, I kept the in-memory approach because of assignment.

## Accessibility checks

I checked the interface using React Testing Library and Playwright against a production build, including keyboard navigation and a 375px mobile viewport.

- Inputs have visible labels, and validation errors are connected using `aria-invalid` and `aria-describedby`.
- Important sections have accessible names, including **Payment preview**, **Payment queue**, and **Payment in progress**.
- Status messages use `role="status"` so changes can be announced by assistive technology.
- Keyboard focus is maintained when cart controls change and moved to the payment or confirmation section when appropriate.
- Pages use proper headings, visible focus indicators, a skip link, and descriptive page titles.






