import { expect, test, type APIRequestContext } from "@playwright/test";

async function reads(request: APIRequestContext): Promise<number> {
  return (await (await request.get("/api/debug/reads")).json()).catalogReads;
}

async function lampRemaining(request: APIRequestContext): Promise<number> {
  const catalog: { sku: string; remaining: number }[] = await (await request.get("/api/catalog")).json();
  return catalog.find((i) => i.sku === "lamp")!.remaining;
}

const pages = ["/shop", "/shop?q=lamp", "/shop?sort=price-desc", "/shop/lamp", "/shop/stool", "/checkout"];

test("repeat requests are served from cache; a payment makes the next request fresh", async ({ request }) => {
  // Warm every page once, then measure.
  for (const path of pages) expect((await request.get(path)).status()).toBe(200);
  const warm = await reads(request);

  for (let i = 0; i < 3; i++) {
    for (const path of pages) await request.get(path);
  }
  expect(await reads(request)).toBe(warm);

  // /api/catalog reads the live store and is not counted.
  const before = await lampRemaining(request);
  expect(await reads(request)).toBe(warm);

  const res = await request.post("/api/payments", {
    data: { email: "cache@example.com", sku: "lamp", externalChargeId: `ch_cache${Date.now()}` },
  });
  expect(res.status()).toBe(201);

  const after = `${before - 1} left`;
  expect(await (await request.get("/shop")).text()).toContain(after);
  expect(await (await request.get("/shop/lamp")).text()).toContain(after);

  // One fresh read serves every page; after that we are back to cache hits.
  const refreshed = await reads(request);
  expect(refreshed).toBeGreaterThan(warm);
  for (const path of pages) await request.get(path);
  for (const path of pages) await request.get(path);
  expect(await reads(request)).toBe(refreshed);
});

test("a replayed or rejected payment does not touch the cache", async ({ request }) => {
  const id = `ch_replay${Date.now()}`;
  const body = { email: "replay@example.com", sku: "lamp", externalChargeId: id };
  expect((await request.post("/api/payments", { data: body })).status()).toBe(201);
  await request.get("/shop");
  const warm = await reads(request);

  expect((await request.post("/api/payments", { data: body })).status()).toBe(200);
  expect((await request.post("/api/payments", { data: { ...body, externalChargeId: "bad" } })).status()).toBe(400);
  await request.get("/shop");
  expect(await reads(request)).toBe(warm);
});
