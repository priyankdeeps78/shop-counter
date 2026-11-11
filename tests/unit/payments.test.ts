import { revalidateTag } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { validatePayment } from "@/lib/payments/validate-payment";
import { findItem } from "@/lib/store";
import { post } from "./route-fetch";

// Wrap the real validatePayment in a spy so the tests can prove both routes
// go through it, not through look-alike copies.
vi.mock("@/lib/payments/validate-payment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/validate-payment")>();
  return { ...actual, validatePayment: vi.fn(actual.validatePayment) };
});

const lampWithCushion = {
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId: "ch_12345678",
  extraCode: "cushion",
};

const remaining = (sku: string) => findItem(sku)?.remaining;

describe("shared validation: preview and record", () => {
  it("both reject Cushion on Maple lamp through validatePayment, and neither writes", async () => {
    const previewRes = await post("/api/payments/preview", lampWithCushion);
    const recordRes = await post("/api/payments", lampWithCushion);

    for (const res of [previewRes, recordRes]) {
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        ok: false,
        errors: { extraCode: "That extra is not sold with this item" },
      });
    }
    expect(validatePayment).toHaveBeenCalledTimes(2);
    expect(validatePayment).toHaveBeenNthCalledWith(1, lampWithCushion);
    expect(validatePayment).toHaveBeenNthCalledWith(2, lampWithCushion);
    expect(remaining("lamp")).toBe(5);
  });

  it("a successful preview leaves remaining unchanged", async () => {
    const res = await post("/api/payments/preview", {
      email: "  Ada@Example.COM ",
      sku: "stool",
      externalChargeId: "ch_12345678",
      extraCode: "cushion",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
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
    expect(remaining("stool")).toBe(2);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("lists only the fields that failed", async () => {
    const res = await post("/api/payments/preview", { email: "a@@b", sku: "lamp" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      errors: {
        email: "Enter a valid email",
        externalChargeId: "Enter a charge id like ch_12345678",
      },
    });
  });
});

describe("POST /api/payments", () => {
  const lamp = { email: "Ada@Example.com", sku: "lamp", externalChargeId: "ch_12345678" };

  it("records once, takes one off stock and invalidates the cached catalogue", async () => {
    const res = await post("/api/payments", lamp);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
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
    expect(remaining("lamp")).toBe(4);
    expect(revalidateTag).toHaveBeenCalledWith("catalog", { expire: 0 });
  });

  it("replays the original payment for a repeated charge id without taking stock", async () => {
    await post("/api/payments", lamp);
    const replay = await post("/api/payments", {
      ...lamp,
      sku: "stool",
      extraCode: "cushion",
    });

    expect(replay.status).toBe(200);
    const body = await replay.json();
    expect(body.replayed).toBe(true);
    expect(body.payment).toMatchObject({ sku: "lamp", totalCents: 8000 });
    expect(remaining("lamp")).toBe(4);
    expect(remaining("stool")).toBe(2);
  });

  it("allows a second charge for the same email and item, then answers 409 when sold out", async () => {
    const stool = { email: "ada@example.com", sku: "stool" };
    expect((await post("/api/payments", { ...stool, externalChargeId: "ch_aaaaaaaa" })).status).toBe(201);
    expect((await post("/api/payments", { ...stool, externalChargeId: "ch_bbbbbbbb" })).status).toBe(201);

    const soldOut = await post("/api/payments", { ...stool, externalChargeId: "ch_cccccccc" });
    expect(soldOut.status).toBe(409);
    expect(await soldOut.json()).toEqual({ ok: false, errors: { sku: "Sold out" } });
    expect(remaining("stool")).toBe(0);

    // Retrying the charge that bought the last one is still a replay, not "Sold out".
    const retry = await post("/api/payments", { ...stool, externalChargeId: "ch_bbbbbbbb" });
    expect(retry.status).toBe(200);
  });
});
