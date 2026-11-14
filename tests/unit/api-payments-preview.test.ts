import { beforeEach, describe, expect, it, vi } from "vitest";

const nextCache = vi.hoisted(() => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => nextCache);

import * as previewRoute from "@/app/api/payments/preview/route";
import { getStore, resetStore } from "@/server/store";
import { snapshotStore } from "../support/store-snapshot";

const URL = "http://localhost/api/payments/preview";
const post = (body: string | undefined, contentType = "application/json") =>
  previewRoute.POST(new Request(URL, { method: "POST", body, headers: { "content-type": contentType } }));
const postJson = (body: unknown) => post(JSON.stringify(body));

const lamp = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };
const REQUIRED = {
  email: "Enter a valid email",
  sku: "Choose an item",
  externalChargeId: "Enter a charge id like ch_12345678",
};

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("POST /api/payments/preview", () => {
  it("answers 200 with the brief's body for the lamp example", async () => {
    const response = await postJson({ email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toStrictEqual({
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

  it("answers 400 for the Cushion on a Maple lamp, listing only that field", async () => {
    const response = await postJson({ ...lamp, extraCode: "cushion" });
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({
      ok: false,
      errors: { extraCode: "That extra is not sold with this item" },
    });
  });

  it("answers 400 with all failing fields together", async () => {
    const response = await postJson({ email: "x", sku: "chair", externalChargeId: "ch_", extraCode: "cushion" });
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({
      ok: false,
      errors: { ...REQUIRED, extraCode: "That extra is not sold with this item" },
    });
  });

  it.each([
    ["broken JSON", "{"],
    ["an empty body", undefined],
    ["JSON null", "null"],
    ["a JSON array", "[]"],
    ["a JSON string", '"lamp"'],
    ["plain text", "email=ada@example.com"],
  ])("answers 400 (not 500) for %s", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ ok: false, errors: REQUIRED });
  });

  it("answers 409 'Sold out' when the item has no stock left", async () => {
    getStore().products.get("lamp")!.remaining = 0;
    const response = await postJson(lamp);
    expect(response.status).toBe(409);
    expect(await response.json()).toStrictEqual({ ok: false, errors: { sku: "Sold out" } });
  });

  it("writes nothing and never expires the catalogue cache", async () => {
    const before = snapshotStore(getStore());
    for (let i = 0; i < 5; i++) {
      await postJson(lamp);
      await postJson({ ...lamp, sku: "stool", extraCode: "cushion" });
      await postJson({ ...lamp, extraCode: "cushion" });
      await post("{");
    }
    expect(snapshotStore(getStore())).toStrictEqual(before);
    expect(nextCache.revalidateTag).not.toHaveBeenCalled();
  });

  it("exposes only POST", () => {
    expect(Object.keys(previewRoute)).toEqual(["POST"]);
  });
});
