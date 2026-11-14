import { expect, test, type APIRequestContext } from "@playwright/test";

const PREVIEW = "/api/payments/preview";
const lamp = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };

async function liveStock(request: APIRequestContext, sku: string): Promise<number | null> {
  const catalog: { sku: string; remaining: number | null }[] = await (await request.get("/api/catalog")).json();
  return catalog.find((item) => item.sku === sku)!.remaining;
}
const catalogReads = async (request: APIRequestContext) =>
  (await (await request.get("/api/debug/reads")).json()).catalogReads;

// Runs against the production server. Other specs may record payments, so the
// expected remainingAfter is computed from the live stock rather than assumed.
test.describe("POST /api/payments/preview", () => {
  test("previews a lamp with server prices and live stock", async ({ request }) => {
    const before = (await liveStock(request, "lamp"))!;
    const response = await request.post(PREVIEW, { data: { ...lamp, email: " Ada@Example.com " } });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toStrictEqual({
      ok: true,
      preview: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        extraName: null,
        totalCents: 8000,
        remainingAfter: before - 1,
      },
    });
  });

  test("prices a stool with the Cushion at 14500 cents", async ({ request }) => {
    const response = await request.post(PREVIEW, { data: { ...lamp, sku: "stool", extraCode: "cushion", totalCents: 1 } });
    expect(response.status()).toBe(200);
    expect((await response.json()).preview).toMatchObject({ extraName: "Cushion", totalCents: 14500 });
  });

  test("rejects the Cushion on a Maple lamp with 400 and only that field", async ({ request }) => {
    const response = await request.post(PREVIEW, { data: { ...lamp, extraCode: "cushion" } });
    expect(response.status()).toBe(400);
    expect(await response.json()).toStrictEqual({
      ok: false,
      errors: { extraCode: "That extra is not sold with this item" },
    });
  });

  test("answers 400, not 500, for a body that is not JSON", async ({ request }) => {
    const response = await request.post(PREVIEW, {
      data: "{not json",
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  test("only accepts POST", async ({ request }) => {
    expect((await request.get(PREVIEW)).status()).toBe(405);
  });

  test("repeated previews change nothing: stock, shop page, or catalogue reads", async ({ request }) => {
    const lampBefore = await liveStock(request, "lamp");
    const stoolBefore = await liveStock(request, "stool");
    await request.get("/shop/lamp"); // warm the page so the read count is settled
    const readsBefore = await catalogReads(request);

    for (let i = 0; i < 5; i++) {
      await request.post(PREVIEW, { data: lamp });
      await request.post(PREVIEW, { data: { ...lamp, sku: "stool", extraCode: "cushion" } });
      await request.post(PREVIEW, { data: { ...lamp, extraCode: "cushion" } });
    }

    expect(await liveStock(request, "lamp")).toBe(lampBefore);
    expect(await liveStock(request, "stool")).toBe(stoolBefore);
    const page = await (await request.get("/shop/lamp")).text();
    expect(page).toContain(`${lampBefore} left`);
    expect(await catalogReads(request)).toBe(readsBefore);
  });
});
