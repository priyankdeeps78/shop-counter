import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);

/**
 * End-to-end tests run against a production build (`next build` + `next start`),
 * because the caching requirements only hold there: `next dev` re-renders
 * on every request.
 *
 * The store is in memory and shared by every test, so tests run one at a time
 * against a fresh server, and each test only asserts on changes it causes.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/debug/reads`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
