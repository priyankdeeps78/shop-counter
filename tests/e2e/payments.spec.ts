import { expect, test } from "@playwright/test";
import { catalogReads, liveStock, newChargeId } from "./support/api";

// Production server, shared with other specs: stock is read live and compared
// as before/after, and every new charge uses a fresh id. This spec takes two of
// the five lamps per run; selling out is covered by sold-out.spec.ts (runs last).
const lampWith = (externalChargeId: string) => ({
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId,
});

test.describe("POST /api/payments", () => {
  test("a new payment is 201, the next shop requests show the new stock, and a replay changes nothing", async ({
    request,
  }) => {
    const before = (await liveStock(request, "lamp"))!;
    const stoolBefore = await liveStock(request, "stool");
    const pages = ["/shop", "/shop/lamp", "/shop?q=lamp", "/shop/stool"];
    for (const page of pages) await request.get(page);
    const warmed = await catalogReads(request);
    for (const page of pages) await request.get(page);
    expect(await catalogReads(request), "repeat requests reuse the cache").toBe(warmed);

    const chargeId = newChargeId();
    const created = await request.post("/api/payments", {
      data: { ...lampWith(chargeId), email: " Ada@Example.com ", totalCents: 1 },
    });
    expect(created.status()).toBe(201);
    const payment = {
      email: "ada@example.com",
      sku: "lamp",
      itemName: "Maple lamp",
      extraCode: null,
      externalChargeId: chargeId,
      totalCents: 8000,
    };
    expect(await created.json()).toStrictEqual({ replayed: false, payment });
    expect(await catalogReads(request), "expiring the tag runs nothing by itself").toBe(warmed);
    expect(await liveStock(request, "lamp")).toBe(before - 1);

    // The very first request after the write is fresh — no stale response first.
    expect(await (await request.get("/shop/lamp")).text()).toContain(`>${before - 1} left<`);
    expect(await (await request.get("/shop")).text()).toContain(`>${before - 1} left<`);
    expect(await (await request.get("/shop?q=lamp")).text()).toContain(`>${before - 1} left<`);
    expect(await catalogReads(request), "one recompute serves every shop page").toBe(warmed + 1);
    for (const page of pages) await request.get(page);
    expect(await catalogReads(request)).toBe(warmed + 1);

    // Replay with different details: original payment, no stock change, no cache expiry.
    const replay = await request.post("/api/payments", {
      data: { email: "other@example.com", sku: "stool", externalChargeId: chargeId, extraCode: "cushion" },
    });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toStrictEqual({ replayed: true, payment });
    expect(await liveStock(request, "lamp")).toBe(before - 1);
    expect(await liveStock(request, "stool")).toBe(stoolBefore);
    for (const page of pages) await request.get(page);
    expect(await catalogReads(request), "a replay does not expire the cache").toBe(warmed + 1);
  });

  // Required test 2 (brief), against the production server.
  test("preview and record both reject Cushion on Maple lamp; a preview leaves remaining unchanged", async ({
    request,
  }) => {
    const before = await liveStock(request, "lamp");
    const lampWithCushion = { ...lampWith(newChargeId()), extraCode: "cushion" };
    const expected = { ok: false, errors: { extraCode: "That extra is not sold with this item" } };

    const preview = await request.post("/api/payments/preview", { data: lampWithCushion });
    expect(preview.status()).toBe(400);
    expect(await preview.json()).toStrictEqual(expected);

    const record = await request.post("/api/payments", { data: lampWithCushion });
    expect(record.status()).toBe(400);
    expect(await record.json()).toStrictEqual(expected);

    const okPreview = await request.post("/api/payments/preview", { data: lampWith(newChargeId()) });
    expect(okPreview.status()).toBe(200);
    expect(await liveStock(request, "lamp")).toBe(before);
  });

  test("answers 400, not 500, for a body that is not JSON", async ({ request }) => {
    const response = await request.post("/api/payments", {
      data: "{oops",
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(400);
  });

  test("an open shop page shows the new stock on the next navigation after a payment", async ({ page, request }) => {
    await page.goto("/shop");
    const lampCard = page.getByRole("list", { name: "Products" }).getByRole("listitem").filter({ hasText: "Maple lamp" });
    const before = (await liveStock(request, "lamp"))!;
    await expect(lampCard.getByText(/left$/)).toHaveText(`${before} left`);

    expect((await request.post("/api/payments", { data: lampWith(newChargeId()) })).status()).toBe(201);

    await lampCard.getByRole("link", { name: "Maple lamp" }).click();
    await expect(page).toHaveURL(/\/shop\/lamp$/);
    await expect(page.getByText("Stock").locator("+ dd")).toHaveText(`${before - 1} left`);
  });
});
