import { vi } from "vitest";

// Route handlers call `connection()` so Next.js always runs them at request time.
// Outside a real Next.js request it throws, so unit tests that call handlers
// directly replace only that function. Whether handlers are actually dynamic is
// checked against the production build (build output and Playwright).
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
