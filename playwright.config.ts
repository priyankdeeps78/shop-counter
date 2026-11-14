import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

// The app keeps all state in one server process, so browser tests run serially
// against a single fresh production server (`next build` + `next start`).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /sold-out\.spec\.ts/,
    },
    // Selling an item out cannot be undone in this server process, so that spec
    // runs last, after every other spec has finished.
    {
      name: "sold-out",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /sold-out\.spec\.ts/,
      dependencies: ["chromium"],
    },
  ],
  webServer: {
    command: `npm run build && npx next start --hostname 127.0.0.1 --port ${port}`,
    url: baseURL + "/shop",
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
