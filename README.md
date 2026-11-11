# Shop counter

A small shop built with Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, react-hook-form, zod, Vitest + React Testing Library, and Playwright. It has three parts:

- `/shop` and `/shop/<sku>`: a server-rendered, cached catalogue with search and sort in the URL.
- `/desk`: the staff desk that previews and records lamp and stool payments.
- `/checkout`: charges the cart as it was when Pay was pressed.

All data is in memory and resets when the server restarts. Design notes are in [ARCHITECTURE.md](ARCHITECTURE.md).

- **`validatePayment` is exported from [`lib/payments/validate-payment.ts`](lib/payments/validate-payment.ts).**
- **Deployed URL:** _TODO_
- **Time spent:** _TODO_

## Requirements

- **Node.js 22** (developed on 22.23.1; Next 16 needs at least 20.9)
- npm (developed on 10.9)

## Commands

```bash
npm install
npx playwright install chromium   # once, for the e2e tests
```

| What | Command |
| --- | --- |
| Dev server on http://localhost:3000 | `npm run dev` |
| Production build and server | `npm run build && npm start` |
| Unit and component tests (Vitest + RTL) | `npm test` |
| End-to-end tests (Playwright) | `npm run test:e2e` |
| Typecheck and lint | `npm run typecheck && npm run lint` |

`npm run test:e2e` runs `next build`, starts `next start` on port 3210 (set `E2E_PORT` to change it), and runs every spec against that production server. The caching rules only hold on a production build, so the tests don't use `next dev`. Each run starts a fresh server, because tests share the in-memory store.

`next dev` caches `getCatalog()` too, but it also throws cache entries away when you edit files. Check caching on `npm run build && npm start`, where the brief's requirements apply.

## The three required tests

| # | Test | File |
| --- | --- | --- |
| 1 | Divergence: pay for a notebook, add a pen, Amount due stays $15 with the warning shown, and the order is the notebook at $15 | `tests/unit/checkout.test.tsx` (RTL), also `tests/e2e/checkout.spec.ts` |
| 2 | Shared validation: preview and record both reject Cushion on Maple lamp through the same `validatePayment` (a spy proves both routes call it), and a preview leaves `remaining` unchanged | `tests/unit/payments.test.ts`; the rendered form is also covered in `tests/unit/desk-form.test.tsx` |
| 3 | URL filter: type `lamp`, the URL has `q=lamp` and only Maple lamp is listed, reload keeps it, Back shows all five | `tests/e2e/shop.spec.ts` |

The component tests stub `fetch` with the real route handlers (`tests/unit/route-fetch.ts`), so the UI tests run the actual server logic, not mocks of it.

Other tests:
- `tests/e2e/caching.spec.ts`: the caching requirements, checked through `/api/debug/reads` on the production build.
- `tests/e2e/a11y.spec.ts`: axe-core scans and a keyboard-only flow.
- Unit tests for validation, replay and sold out, the checkout API, and search and sort.

## Layout

```
app/
  shop/page.tsx            static shell + request-time results (cached data)
  shop/shop-controls.tsx   client: writes search/sort to the URL
  shop/[sku]/page.tsx      fully static item page, real 404 for unknown skus
  desk/                    page (server queue) + desk-form (client)
  checkout/                page (server prices) + checkout (client cart)
  api/                     route handlers
lib/
  catalog.ts               getCatalog() ('use cache' + tag) and invalidateCatalog()
  store.ts                 the in-memory store
  payments/validate-payment.ts
  checkout.ts, cart.ts, shop-query.ts, money.ts, seed.ts
tests/unit, tests/e2e
```

## Decisions the brief left open

- **Preview when sold out** answers the same `409 { errors: { sku: "Sold out" } }` as record, instead of returning `remainingAfter: -1`.
- **Order of checks in `POST /api/payments`:**
  1. Validation (400).
  2. Replay check: a repeated `externalChargeId` returns the original payment, even if the new body names another item.
  3. Stock check (409).

  Because the replay check comes before the stock check, retrying the charge that bought the last stool still gets `200 replayed`.
- **`/api/checkout/begin`** only sells notebook, pen and case. Any other sku, including `lamp`, is `invalid_cart`, because checkout does not track stock. Repeated skus are merged into one line. Success is `201`.
- **`/api/checkout/complete`** answers `404 { error: "attempt_not_found" }` for an unknown id, and `400 { error: "invalid_request" }` without an id.
- **After an order**, the bought quantities leave the cart. Anything added after Pay stays.
- The desk's Cushion option is disabled unless Cedar stool is selected. Switching to Maple lamp clears it.
- Shop search ignores case and matches anywhere in the name. Unknown `sort` values fall back to `name`. Default values are left out of the URL.

## What is missing

- Testing with a real screen reader (see ARCHITECTURE.md).
- Deployment: _TODO_

## AI tools

_TODO: say which tools you used, for which parts, and one place you disagreed with the output and why._
