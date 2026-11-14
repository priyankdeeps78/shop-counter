import type { Store } from "@/server/store";

/** A deep, plain copy of everything in a store, for "nothing changed" assertions. */
export function snapshotStore(store: Store) {
  return structuredClone({
    products: [...store.products.entries()],
    paymentsByChargeId: [...store.paymentsByChargeId.entries()],
    paymentQueue: store.paymentQueue,
    attemptsById: [...store.attemptsById.entries()],
    ordersByAttemptId: [...store.ordersByAttemptId.entries()],
    catalogReads: store.catalogReads,
  });
}
