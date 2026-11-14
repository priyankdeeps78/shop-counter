import { beforeEach, describe, expect, it, vi } from "vitest";

const nextCache = vi.hoisted(() => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => nextCache);

import * as recordRoute from "@/app/api/payments/route";
import { getStore, resetStore } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const post = (body: unknown) =>
  recordRoute.POST(
    new Request("http://localhost/api/payments", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
const lamp = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };
const PAYMENT = {
  email: "ada@example.com",
  sku: "lamp",
  itemName: "Maple lamp",
  extraCode: null,
  externalChargeId: "ch_12345678",
  totalCents: 8000,
};

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("POST /api/payments", () => {
  it("answers 201 with the brief's body, takes 1 off stock, and expires the catalogue cache", async () => {
    const response = await post(lamp);
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toStrictEqual({ replayed: false, payment: PAYMENT });
    expect(getStore().products.get("lamp")!.remaining).toBe(4);
    expect(nextCache.revalidateTag).toHaveBeenCalledExactlyOnceWith("catalog", { expire: 0 });
  });

  it("answers 200 replayed:true with the original payment, without a second decrement or cache expiry", async () => {
    await post(lamp);
    vi.clearAllMocks();
    const response = await post({ ...lamp, sku: "stool", extraCode: "cushion" });
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ replayed: true, payment: PAYMENT });
    expect(getStore().products.get("lamp")!.remaining).toBe(4);
    expect(getStore().products.get("stool")!.remaining).toBe(2);
    expect(getStore().paymentQueue).toHaveLength(1);
    expect(nextCache.revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 409 with the exact Sold out body once stock is 0, and does not expire the cache", async () => {
    getStore().products.get("lamp")!.remaining = 1;
    expect((await post(lamp)).status).toBe(201);
    vi.clearAllMocks();
    const response = await post({ ...lamp, externalChargeId: "ch_99999999" });
    expect(response.status).toBe(409);
    expect(await response.json()).toStrictEqual({ ok: false, errors: { sku: "Sold out" } });
    expect(getStore().products.get("lamp")!.remaining).toBe(0);
    expect(nextCache.revalidateTag).not.toHaveBeenCalled();
  });

  it("replays with 200 even after the item has sold out", async () => {
    getStore().products.get("lamp")!.remaining = 1;
    await post(lamp);
    const response = await post(lamp);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ replayed: true, payment: PAYMENT });
  });

  it("answers 400 with only the failing fields and writes nothing", async () => {
    const before = snapshotStore(getStore());
    const response = await post({ ...lamp, email: "nope", extraCode: "cushion" });
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({
      ok: false,
      errors: { email: "Enter a valid email", extraCode: "That extra is not sold with this item" },
    });
    expect(snapshotStore(getStore())).toStrictEqual(before);
    expect(nextCache.revalidateTag).not.toHaveBeenCalled();
  });

  it.each([["broken JSON", "{"], ["JSON null", "null"], ["a JSON array", "[]"]])(
    "answers 400 (not 500) for %s",
    async (_label, body) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect((await response.json()).ok).toBe(false);
    },
  );

  it("exposes only POST", () => {
    expect(Object.keys(recordRoute)).toEqual(["POST"]);
  });
});
