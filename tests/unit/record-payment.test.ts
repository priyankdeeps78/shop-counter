import { describe, expect, it } from "vitest";
import { recordPayment } from "@/server/payments";
import { createStore, type Store } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const lamp = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };
const stool = { email: "ada@example.com", sku: "stool", externalChargeId: "ch_stool0001", extraCode: "cushion" };
const stock = (store: Store, sku: "lamp" | "stool") => store.products.get(sku)!.remaining;

describe("recordPayment — new charge", () => {
  it("records the brief's lamp example and takes 1 off stock", () => {
    const store = createStore();
    expect(recordPayment(lamp, store)).toStrictEqual({
      ok: true,
      replayed: false,
      payment: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        externalChargeId: "ch_12345678",
        totalCents: 8000,
      },
    });
    expect(stock(store, "lamp")).toBe(4);
    expect(store.paymentQueue).toHaveLength(1);
    expect(store.paymentsByChargeId.get("ch_12345678")).toEqual(store.paymentQueue[0]);
  });

  it("prices a stool with the Cushion at 14500 and takes stock 2 → 1", () => {
    const store = createStore();
    const outcome = recordPayment(stool, store);
    expect(outcome).toMatchObject({ ok: true, replayed: false, payment: { totalCents: 14500, extraCode: "cushion" } });
    expect(stock(store, "stool")).toBe(1);
  });

  it("stores the normalised email and the server price, ignoring client money fields", () => {
    const store = createStore();
    recordPayment({ ...lamp, email: "  ADA@Example.com ", totalCents: 1, itemName: "Free" }, store);
    expect(store.paymentQueue[0]).toMatchObject({ email: "ada@example.com", totalCents: 8000, itemName: "Maple lamp" });
  });

  it("allows a second new charge for the same email and item while stock remains", () => {
    const store = createStore();
    recordPayment(lamp, store);
    const second = recordPayment({ ...lamp, externalChargeId: "ch_87654321" }, store);
    expect(second).toMatchObject({ ok: true, replayed: false });
    expect(stock(store, "lamp")).toBe(3);
    expect(store.paymentQueue.map((p) => p.externalChargeId)).toEqual(["ch_12345678", "ch_87654321"]);
  });

  it("keeps the queue in recording order", () => {
    const store = createStore();
    recordPayment(lamp, store);
    recordPayment(stool, store);
    recordPayment({ ...lamp, externalChargeId: "ch_aaaaaaaa" }, store);
    expect(store.paymentQueue.map((p) => p.sku)).toEqual(["lamp", "stool", "lamp"]);
  });
});

describe("recordPayment — replay (same externalChargeId)", () => {
  it("returns the original payment and changes nothing", () => {
    const store = createStore();
    const first = recordPayment(lamp, store);
    const before = snapshotStore(store);
    const again = recordPayment(lamp, store);
    expect(again).toStrictEqual({ ...first, replayed: true });
    expect(snapshotStore(store)).toStrictEqual(before);
  });

  it("returns the original sku and total even when the retry names another item", () => {
    const store = createStore();
    recordPayment(lamp, store);
    const retry = recordPayment(
      { email: "someone@else.com", sku: "stool", externalChargeId: "ch_12345678", extraCode: "cushion" },
      store,
    );
    expect(retry).toMatchObject({
      ok: true,
      replayed: true,
      payment: { email: "ada@example.com", sku: "lamp", itemName: "Maple lamp", extraCode: null, totalCents: 8000 },
    });
    expect(stock(store, "stool")).toBe(2);
    expect(store.paymentQueue).toHaveLength(1);
  });

  it("still replays after the item has sold out", () => {
    const store = createStore();
    recordPayment(stool, store);
    recordPayment({ ...stool, externalChargeId: "ch_stool0002" }, store);
    expect(stock(store, "stool")).toBe(0);
    expect(recordPayment({ ...stool, externalChargeId: "ch_stool0003" }, store)).toMatchObject({ reason: "sold_out" });

    const replay = recordPayment(stool, store);
    expect(replay).toMatchObject({ ok: true, replayed: true, payment: { externalChargeId: "ch_stool0001", totalCents: 14500 } });
    expect(stock(store, "stool")).toBe(0);
    expect(store.paymentQueue).toHaveLength(2);
  });

  it("validates a replay first: an invalid retry is a 400, not a replay", () => {
    const store = createStore();
    recordPayment(lamp, store);
    expect(recordPayment({ ...lamp, email: "broken" }, store)).toStrictEqual({
      ok: false,
      reason: "invalid",
      errors: { email: "Enter a valid email" },
    });
  });

  it("returns a copy: editing the response cannot change the stored payment", () => {
    const store = createStore();
    const outcome = recordPayment(lamp, store);
    if (!outcome.ok) throw new Error("expected success");
    outcome.payment.totalCents = 1;
    expect(store.paymentsByChargeId.get("ch_12345678")!.totalCents).toBe(8000);
    expect(Object.isFrozen(store.paymentQueue[0])).toBe(true);
  });
});

describe("recordPayment — sold out", () => {
  it("records the last unit, then answers Sold out and never goes below 0", () => {
    const store = createStore();
    for (let i = 1; i <= 5; i++) {
      expect(recordPayment({ ...lamp, externalChargeId: `ch_lamp000${i}` }, store)).toMatchObject({ replayed: false });
    }
    expect(stock(store, "lamp")).toBe(0);
    const before = snapshotStore(store);
    for (let i = 6; i <= 8; i++) {
      expect(recordPayment({ ...lamp, externalChargeId: `ch_lamp000${i}` }, store)).toStrictEqual({
        ok: false,
        reason: "sold_out",
        errors: { sku: "Sold out" },
      });
    }
    expect(snapshotStore(store)).toStrictEqual(before);
    expect(stock(store, "lamp")).toBe(0);
  });

  it("does not stop the other item from selling", () => {
    const store = createStore();
    store.products.get("lamp")!.remaining = 0;
    expect(recordPayment(stool, store)).toMatchObject({ ok: true, replayed: false });
  });
});

describe("recordPayment — invalid input writes nothing", () => {
  it.each([
    ["Cushion on a Maple lamp", { ...lamp, extraCode: "cushion" }],
    ["a bad charge id", { ...lamp, externalChargeId: "ch_1" }],
    ["a checkout item", { ...lamp, sku: "pen" }],
    ["a null body", null],
  ])("%s", (_label, input) => {
    const store = createStore();
    const before = snapshotStore(store);
    expect(recordPayment(input, store)).toMatchObject({ ok: false, reason: "invalid" });
    expect(snapshotStore(store)).toStrictEqual(before);
  });
});
