import { expect, test } from "@playwright/test";
import { liveStock, newChargeId } from "./support/api";

// Runs in the "sold-out" Playwright project, after every other spec, because it
// sells the Cedar stool out for the rest of this server process.
test("selling the last stool: 409 Sold out, never negative, fresh pages, replays still answer", async ({
  request,
}) => {
  const stool = (externalChargeId: string, extra: Record<string, unknown> = {}) => ({
    email: "grace@example.com",
    sku: "stool",
    externalChargeId,
    extraCode: "cushion",
    ...extra,
  });
  const left = (await liveStock(request, "stool"))!;
  expect(left).toBeGreaterThan(0);

  const firstChargeId = newChargeId();
  for (let i = 0; i < left; i++) {
    const id = i === 0 ? firstChargeId : newChargeId();
    const response = await request.post("/api/payments", { data: stool(id) });
    expect(response.status()).toBe(201);
    expect((await response.json()).payment.totalCents).toBe(14500);
  }
  expect(await liveStock(request, "stool")).toBe(0);

  for (let i = 0; i < 3; i++) {
    const response = await request.post("/api/payments", { data: stool(newChargeId()) });
    expect(response.status()).toBe(409);
    expect(await response.json()).toStrictEqual({ ok: false, errors: { sku: "Sold out" } });
  }
  expect(await liveStock(request, "stool"), "stock never goes below 0").toBe(0);

  // The first page requests after the last sale already show 0.
  expect(await (await request.get("/shop/stool")).text()).toContain(">0 left<");
  expect(await (await request.get("/shop?q=stool")).text()).toContain(">0 left<");

  // A replay of an earlier stool charge still answers with the original payment.
  const lampBefore = await liveStock(request, "lamp");
  const replay = await request.post("/api/payments", {
    data: { email: "x@y.z", sku: "lamp", externalChargeId: firstChargeId },
  });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toStrictEqual({
    replayed: true,
    payment: {
      email: "grace@example.com",
      sku: "stool",
      itemName: "Cedar stool",
      extraCode: "cushion",
      externalChargeId: firstChargeId,
      totalCents: 14500,
    },
  });
  expect(await liveStock(request, "lamp"), "replay takes nothing from the other item").toBe(lampBefore);

  // Preview agrees with record once the item is gone.
  const preview = await request.post("/api/payments/preview", { data: stool(newChargeId()) });
  expect(preview.status()).toBe(409);
  expect(await preview.json()).toStrictEqual({ ok: false, errors: { sku: "Sold out" } });
});
