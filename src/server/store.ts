import "server-only";
import type {
  CheckoutAttempt,
  Order,
  Payment,
  Product,
  Sku,
} from "@/types/domain";

/** All server state. Lives in the memory of one server process; a restart resets it. */
export type Store = {
  /** Keyed by sku, in catalogue order (Map keeps insertion order). */
  products: Map<Sku, Product>;
  paymentsByChargeId: Map<string, Payment>;
  /** Recorded payments, oldest first. */
  paymentQueue: Payment[];
  attemptsById: Map<string, CheckoutAttempt>;
  ordersByAttemptId: Map<string, Order>;
  /** How many times the cached `getCatalog()` body has actually run. */
  catalogReads: number;
};

/** Fresh product objects on every call, so no two stores ever share an object. */
function seedProducts(): Product[] {
  return [
    {
      sku: "lamp",
      name: "Maple lamp",
      priceCents: 8000,
      remaining: 5,
      extras: [],
    },
    {
      sku: "stool",
      name: "Cedar stool",
      priceCents: 12000,
      remaining: 2,
      extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
    },
    {
      sku: "notebook",
      name: "Field notebook",
      priceCents: 1500,
      remaining: null,
      extras: [],
    },
    {
      sku: "pen",
      name: "Gel pen",
      priceCents: 400,
      remaining: null,
      extras: [],
    },
    {
      sku: "case",
      name: "Slip case",
      priceCents: 2200,
      remaining: null,
      extras: [],
    },
  ];
}

/** A new, independent store seeded with the initial catalogue. Tests use one per case. */
export function createStore(): Store {
  return {
    products: new Map(seedProducts().map((product) => [product.sku, product])),
    paymentsByChargeId: new Map(),
    paymentQueue: [],
    attemptsById: new Map(),
    ordersByAttemptId: new Map(),
    catalogReads: 0,
  };
}

// The app's one store per server process. It is held on `globalThis` rather than
// in a module variable because Next.js may load this module more than once in a
// process (route handlers and pages are bundled separately, and dev reloads
// modules); all of them must share the same state. This is not shared across
// processes or serverless instances.
const holder = globalThis as typeof globalThis & { __shopCounterStore?: Store };

export function getStore(): Store {
  holder.__shopCounterStore ??= createStore();
  return holder.__shopCounterStore;
}

/** Replaces the process store with a fresh one. Used by tests that call route handlers. */
export function resetStore(): Store {
  holder.__shopCounterStore = createStore();
  return holder.__shopCounterStore;
}
