import { describe, expect, it } from "vitest";
import { previewPayment, quotePayment, rejectionStatus } from "@/server/payments";
import { createStore } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const lamp = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };
const stoolWithCushion = { ...lamp, sku: "stool", extraCode: "cushion" };

describe("previewPayment — success", () => {
  it("previews the brief's lamp example exactly", () => {
    expect(previewPayment(lamp, createStore())).toStrictEqual({
      ok: true,
      preview: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        extraName: null,
        totalCents: 8000,
        remainingAfter: 4,
      },
    });
  });

  it("prices a Cedar stool with the Cushion at $145 and shows 1 left after", () => {
    expect(previewPayment(stoolWithCushion, createStore())).toStrictEqual({
      ok: true,
      preview: {
        email: "ada@example.com",
        sku: "stool",
        itemName: "Cedar stool",
        extraCode: "cushion",
        extraName: "Cushion",
        totalCents: 14500,
        remainingAfter: 1,
      },
    });
  });

  it("prices a Cedar stool without an extra at $120", () => {
    const outcome = previewPayment({ ...lamp, sku: "stool", extraCode: null }, createStore());
    expect(outcome).toMatchObject({ ok: true, preview: { totalCents: 12000, extraName: null, remainingAfter: 1 } });
  });

  it("shows the trimmed, lowercased email", () => {
    const outcome = previewPayment({ ...lamp, email: "  ADA@Example.com " }, createStore());
    expect(outcome.ok && outcome.preview.email).toBe("ada@example.com");
  });

  it("ignores any price or stock the client sends", () => {
    const outcome = previewPayment(
      { ...lamp, totalCents: 1, priceCents: 1, itemName: "Free lamp", remainingAfter: 99 },
      createStore(),
    );
    expect(outcome).toMatchObject({
      ok: true,
      preview: { totalCents: 8000, itemName: "Maple lamp", remainingAfter: 4 },
    });
  });

  it("uses the live stock: remainingAfter follows the store", () => {
    const store = createStore();
    store.products.get("lamp")!.remaining = 2;
    expect(previewPayment(lamp, store)).toMatchObject({ ok: true, preview: { remainingAfter: 1 } });
    store.products.get("lamp")!.remaining = 1;
    expect(previewPayment(lamp, store)).toMatchObject({ ok: true, preview: { remainingAfter: 0 } });
  });

  it("uses the live price", () => {
    const store = createStore();
    store.products.get("stool")!.priceCents = 10000;
    expect(previewPayment(stoolWithCushion, store)).toMatchObject({ ok: true, preview: { totalCents: 12500 } });
  });
});

describe("previewPayment — rejected", () => {
  it("rejects the Cushion on a Maple lamp with the shared validation error", () => {
    expect(previewPayment({ ...lamp, extraCode: "cushion" }, createStore())).toStrictEqual({
      ok: false,
      reason: "invalid",
      errors: { extraCode: "That extra is not sold with this item" },
    });
  });

  it("returns only the failing fields", () => {
    expect(previewPayment({ ...lamp, email: "nope", externalChargeId: "ch_1" }, createStore())).toStrictEqual({
      ok: false,
      reason: "invalid",
      errors: { email: "Enter a valid email", externalChargeId: "Enter a charge id like ch_12345678" },
    });
  });

  it("treats a malformed body as an empty form", () => {
    for (const body of [undefined, null, "lamp", 42, []]) {
      expect(previewPayment(body, createStore())).toStrictEqual({
        ok: false,
        reason: "invalid",
        errors: {
          email: "Enter a valid email",
          sku: "Choose an item",
          externalChargeId: "Enter a charge id like ch_12345678",
        },
      });
    }
  });

  it("answers 'Sold out' when no stock is left, never a negative remainingAfter", () => {
    const store = createStore();
    store.products.get("stool")!.remaining = 0;
    expect(previewPayment(stoolWithCushion, store)).toStrictEqual({
      ok: false,
      reason: "sold_out",
      errors: { sku: "Sold out" },
    });
  });

  it("reports validation errors before stock", () => {
    const store = createStore();
    store.products.get("lamp")!.remaining = 0;
    expect(previewPayment({ ...lamp, email: "x" }, store)).toMatchObject({ reason: "invalid" });
  });
});

describe("previewPayment — writes nothing", () => {
  it("leaves the whole store unchanged across valid, invalid, and sold-out previews", () => {
    const store = createStore();
    const before = snapshotStore(store);
    for (let i = 0; i < 10; i++) {
      previewPayment(lamp, store);
      previewPayment(stoolWithCushion, store);
      previewPayment({ ...lamp, extraCode: "cushion" }, store);
      previewPayment(null, store);
    }
    expect(snapshotStore(store)).toStrictEqual(before);

    store.products.get("lamp")!.remaining = 0;
    const soldOut = snapshotStore(store);
    previewPayment(lamp, store);
    expect(snapshotStore(store)).toStrictEqual(soldOut);
  });

  it("returns a new object each time, not a reference into the store", () => {
    const store = createStore();
    const outcome = previewPayment(lamp, store);
    if (!outcome.ok) throw new Error("expected a preview");
    outcome.preview.remainingAfter = -100;
    outcome.preview.totalCents = 0;
    expect(store.products.get("lamp")).toMatchObject({ remaining: 5, priceCents: 8000 });
  });
});

describe("quotePayment", () => {
  it("prices from the catalogue: an extra the item does not sell is rejected", () => {
    const store = createStore();
    store.products.get("stool")!.extras = [];
    expect(
      quotePayment(store, { email: "a@b", sku: "stool", externalChargeId: "ch_12345678", extraCode: "cushion" }),
    ).toStrictEqual({ ok: false, reason: "invalid", errors: { extraCode: "That extra is not sold with this item" } });
  });
});

describe("rejectionStatus", () => {
  it("maps invalid input to 400 and sold out to 409", () => {
    expect(rejectionStatus("invalid")).toBe(400);
    expect(rejectionStatus("sold_out")).toBe(409);
  });
});
