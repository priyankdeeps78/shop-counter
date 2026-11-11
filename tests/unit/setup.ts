import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetStore } from "@/lib/store";

// Route handlers import next/cache. Outside a Next server there is no cache
// to tag or invalidate, so these become spies the tests can assert on.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
  revalidateTag: vi.fn(),
}));

beforeEach(() => resetStore());
afterEach(() => cleanup());
