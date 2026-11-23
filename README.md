# Shop Counter

A small Next.js project with a server-rendered catalogue, a staff payment desk, and a checkout that keeps the amount due fixed after Pay. Data is stored in memory, with no database or payment provider.

## What it does

- **Shop:** Browse products, search and sort using URL parameters, and see item details and stock.
- **Desk:** Preview and record payments, prevent duplicate charges, and view the Payment queue.
- **Checkout:** Edit your cart, start a payment using prices calculated by the server, and complete the order at the original amount, even if you change your cart afterwards.

## Design scope

The brief scoped the design to a clear layout. I added a few visual touches, including a hero image and product photos. The images were converted to WebP and are served directly, with Next.js image optimization disabled.

## Run locally

Requires **Node.js 22** and npm.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. To test a production build locally, run `npm run build` followed by `npm run start`.

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium # one-time setup
npm run test:e2e
```

Playwright uses a production build on port 3100. Tests run sequentially because payments change stock.

The shared payment validator, `validatePayment`, is in [`src/features/payments/lib/payment-validation.ts`](src/features/payments/lib/payment-validation.ts).

Search and sort use URL parameters (`q` and `sort`) and run on the server **after** the shared cached read, so each search doesn't create another cache entry. `/api/catalog` reads the live store directly. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Local vs deployed

Locally, one server process holds the data: recorded payments appear in the **Payment queue**, and stock updates consistently.

On Vercel, different requests may use different serverless instances, each with separate memory. I noticed payments recorded successfully but missing from the queue on a later load; stock can also appear inconsistent. That is expected here. A real app would need shared storage, but the brief explicitly leaves that out.

## AI tools

- I used Claude Code during development, mainly to help with implementing components and API routes, debugging Next.js caching behaviour, and writing tests.

- I reviewed the implementation against the requirements, made decisions around server/client rendering, caching, and payment handling, and verified the important flows using a production build.

- One area where I didn't simply follow the initial suggestions was **caching**. I considered static rendering and time-based revalidation, but chose Next.js `use cache` with cache tags because the catalogue needed to be cached across requests while still showing updated stock immediately after a payment.

- I also chose to keep search and sorting on the server, even though client-side filtering would have been simpler. This keeps the URL, server-rendered results, reloads, and browser history consistent.

- Another decision was disabling Next.js `partialPrefetching`. During production testing, it caused the first request after cache invalidation to show stale stock, and some unknown product URLs returned HTTP 200 instead of 404. I kept it disabled because correctness mattered more than following the framework's default recommendation.

- **Architecture:** [`ARCHITECTURE.md`](ARCHITECTURE.md)
