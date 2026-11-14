import { describe, expect, it } from "vitest";
import { beginCheckout, completeCheckout, orderToJson } from "@/server/checkout";
import { createStore, type Store } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const sequence = (prefix: string) => {
  let n = 0;
  return () => `${prefix}-${++n}`;
};

/** A store with one attempt: 1 Field notebook ($15), id "attempt-1". */
function storeWithNotebookAttempt(): Store {
  const store = createStore();
  beginCheckout({ lines: [{ sku: "notebook", qty: 1 }] }, store, sequence("attempt"));
  return store;
}

const NOTEBOOK_ORDER = {
  orderId: "order-1",
  attemptId: "attempt-1",
  lines: [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }],
  amountCents: 1500,
};

describe("completeCheckout — first completion", () => {
  it("builds the order from the stored snapshot (brief shape)", () => {
    const store = storeWithNotebookAttempt();
    const outcome = completeCheckout({ attemptId: "attempt-1" }, store, sequence("order"));
    expect(outcome.ok && orderToJson(outcome.order)).toStrictEqual(NOTEBOOK_ORDER);
    expect(store.ordersByAttemptId.size).toBe(1);
  });

  it("ignores lines, amounts, and prices sent with the request", () => {
    const store = storeWithNotebookAttempt();
    const outcome = completeCheckout(
      {
        attemptId: "attempt-1",
        lines: [
          { sku: "notebook", qty: 1, unitPriceCents: 1 },
          { sku: "pen", name: "Gel pen", unitPriceCents: 400, qty: 1 },
        ],
        amountCents: 1,
        orderId: "chosen-by-client",
      },
      store,
      sequence("order"),
    );
    expect(outcome.ok && orderToJson(outcome.order)).toStrictEqual(NOTEBOOK_ORDER);
  });

  it("is not affected by catalogue changes after Pay", () => {
    const store = storeWithNotebookAttempt();
    store.products.get("notebook")!.priceCents = 9999;
    const outcome = completeCheckout({ attemptId: "attempt-1" }, store, sequence("order"));
    expect(outcome.ok && outcome.order.amountCents).toBe(1500);
  });

  it("changes nothing but the orders: no stock, payments, attempts, or catalogue reads", () => {
    const store = storeWithNotebookAttempt();
    const before = snapshotStore(store);
    completeCheckout({ attemptId: "attempt-1" }, store, sequence("order"));
    expect({ ...snapshotStore(store), ordersByAttemptId: [] }).toStrictEqual({ ...before, ordersByAttemptId: [] });
  });
});

describe("completeCheckout — repeated completion", () => {
  it("returns the same order (same orderId, lines, amount) and creates no second one", () => {
    const store = storeWithNotebookAttempt();
    const newOrderId = sequence("order");
    const first = completeCheckout({ attemptId: "attempt-1" }, store, newOrderId);
    const second = completeCheckout(
      { attemptId: "attempt-1", lines: [{ sku: "case", qty: 5 }], amountCents: 0 },
      store,
      newOrderId,
    );
    if (!first.ok || !second.ok) throw new Error("expected orders");
    expect(orderToJson(second.order)).toStrictEqual(orderToJson(first.order));
    expect(orderToJson(second.order)).toStrictEqual(NOTEBOOK_ORDER);
    expect(store.ordersByAttemptId.size).toBe(1);
  });

  it("keeps an earlier order unchanged when later attempts start and complete", () => {
    const store = storeWithNotebookAttempt();
    const newAttemptId = sequence("attempt");
    newAttemptId(); // attempt-1 already exists
    const newOrderId = sequence("order");
    completeCheckout({ attemptId: "attempt-1" }, store, newOrderId);

    beginCheckout({ lines: [{ sku: "notebook", qty: 3 }, { sku: "pen", qty: 1 }] }, store, newAttemptId);
    const later = completeCheckout({ attemptId: "attempt-2" }, store, newOrderId);
    expect(later.ok && later.order).toMatchObject({ orderId: "order-2", amountCents: 4900 });

    expect(orderToJson(store.ordersByAttemptId.get("attempt-1")!)).toStrictEqual(NOTEBOOK_ORDER);
  });

  it("stores the order frozen, and the response is a separate copy", () => {
    const store = storeWithNotebookAttempt();
    const outcome = completeCheckout({ attemptId: "attempt-1" }, store, sequence("order"));
    if (!outcome.ok) throw new Error("expected an order");
    expect(Object.isFrozen(outcome.order)).toBe(true);
    expect(Object.isFrozen(outcome.order.lines[0])).toBe(true);

    const response = orderToJson(outcome.order);
    response.amountCents = 1;
    response.lines[0].qty = 50;
    expect(orderToJson(store.ordersByAttemptId.get("attempt-1")!)).toStrictEqual(NOTEBOOK_ORDER);
  });
});

describe("completeCheckout — unknown or invalid attempt ids", () => {
  it("answers not_found for an attempt that was never started, and stores nothing", () => {
    const store = storeWithNotebookAttempt();
    expect(completeCheckout({ attemptId: "attempt-404" }, store)).toStrictEqual({ ok: false, reason: "not_found" });
    expect(store.ordersByAttemptId.size).toBe(0);
  });

  it.each([
    ["a missing attemptId", {}],
    ["an empty attemptId", { attemptId: "" }],
    ["a numeric attemptId", { attemptId: 1 }],
    ["a null attemptId", { attemptId: null }],
    ["only lines", { lines: [{ sku: "notebook", qty: 1 }] }],
    ["a null body", null],
    ["a string body", "attempt-1"],
    ["an array body", ["attempt-1"]],
  ])("answers invalid for %s", (_label, input) => {
    const store = storeWithNotebookAttempt();
    expect(completeCheckout(input, store)).toStrictEqual({ ok: false, reason: "invalid" });
    expect(store.ordersByAttemptId.size).toBe(0);
  });
});
