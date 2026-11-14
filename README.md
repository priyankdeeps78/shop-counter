# Shop counter

A small shop built with the Next.js App Router: a server-rendered catalogue, a
staff desk that records payments, and a checkout that charges the cart as it
was when **Pay** was pressed. All data lives in memory in the server process and
resets when the server restarts.

> Work in progress. Features are added milestone by milestone; see
> [`docs/IMPLEMENTATION_PROGRESS.md`](docs/IMPLEMENTATION_PROGRESS.md) for what is
> done and verified so far.

## Prerequisites

- Node.js 22 (see `.nvmrc`; `nvm use` picks it up)
- npm (lockfile: `package-lock.json`)
- Playwright's Chromium for the browser tests: `npx playwright install chromium`

## Commands

| Task                         | Command             |
| ---------------------------- | ------------------- |
| Install                      | `npm install`       |
| Dev server                   | `npm run dev`       |
| Production build             | `npm run build`     |
| Start production server      | `npm run start`     |
| Lint                         | `npm run lint`      |
| Type-check                   | `npm run typecheck` |
| Unit and component tests     | `npm test`          |
| Browser tests (Playwright)   | `npm run test:e2e`  |

`npm run test:e2e` builds the app and starts it with `next start` on port 3100
(override with `E2E_PORT`), then runs the tests serially against that one
process, because all state is in memory.

## Project layout

```text
src/app/          routes (pages and API route handlers)
src/components/   shared layout components
src/lib/          small shared helpers
tests/unit/       Vitest, node environment
tests/component/  Vitest + React Testing Library, jsdom
tests/e2e/        Playwright against a production build
```

## Shared payment validation

`validatePayment` — path recorded here once it is implemented (Milestone 07).

## Architecture

See `ARCHITECTURE.md` (written in Milestone 14).

## Time spent

To be completed at the end with the actual total.

## AI tools

To be completed at the end.
