// Required test 2 (brief): "Preview and record both reject Cushion on Maple lamp,
// and a preview leaves `remaining` unchanged." Both real route handlers are
// called; a spy on the one exported `validatePayment` proves they share it.
import { beforeEach, describe, expect, it, vi } from "vitest";

const nextCache = vi.hoisted(() => ({ cacheTag: vi.fn(), cacheLife: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => nextCache);

const validation = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock("@/features/payments/lib/payment-validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/payments/lib/payment-validation")>();
  return {
    ...actual,
    validatePayment: (input: unknown) => {
      validation.calls.push(input);
      return actual.validatePayment(input);
    },
  };
});

import { GET as getCatalog } from "@/app/api/catalog/route";
import { POST as record } from "@/app/api/payments/route";
import { POST as preview } from "@/app/api/payments/preview/route";
import { resetStore } from "@/server/store";

const request = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const lampWithCushion = {
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId: "ch_12345678",
  extraCode: "cushion",
};
const lampRemaining = async () => (await (await getCatalog()).json())[0].remaining;

beforeEach(() => {
  resetStore();
  validation.calls = [];
});

describe("shared validation: preview and record", () => {
  it("both reject Cushion on Maple lamp with the same 400 body, through the same validatePayment", async () => {
    const expected = { ok: false, errors: { extraCode: "That extra is not sold with this item" } };

    const previewResponse = await preview(request("/api/payments/preview", lampWithCushion));
    expect(previewResponse.status).toBe(400);
    expect(await previewResponse.json()).toStrictEqual(expected);

    const recordResponse = await record(request("/api/payments", lampWithCushion));
    expect(recordResponse.status).toBe(400);
    expect(await recordResponse.json()).toStrictEqual(expected);

    expect(validation.calls).toEqual([lampWithCushion, lampWithCushion]);
    expect(await lampRemaining()).toBe(5);
  });

  it("a successful preview leaves remaining unchanged", async () => {
    const before = await lampRemaining();
    const response = await preview(
      request("/api/payments/preview", { ...lampWithCushion, extraCode: null }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).preview.remainingAfter).toBe(before - 1);
    expect(await lampRemaining()).toBe(before);
  });
});
