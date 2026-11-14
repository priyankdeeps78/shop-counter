import { expect, test, type APIRequestContext } from "@playwright/test";

async function catalogReads(request: APIRequestContext): Promise<number> {
  const body = await (await request.get("/api/debug/reads")).json();
  return body.catalogReads;
}

// Counter values are compared as deltas: the build and other tests may already
// have caused reads in this server process.
test("repeat shop and item page requests reuse the cached catalogue", async ({ request }) => {
  const urls = [
    "/shop",
    "/shop?q=lamp",
    "/shop?q=sto&sort=price-desc",
    "/shop?sort=price-asc",
    "/shop?q=zzz",
    "/shop/lamp",
    "/shop/stool",
    "/shop/notebook",
    "/shop/pen",
    "/shop/case",
  ];
  for (const url of urls) expect((await request.get(url)).status()).toBe(200);

  const warmed = await catalogReads(request);
  for (let round = 0; round < 3; round++) {
    for (const url of urls) expect((await request.get(url)).status()).toBe(200);
  }
  expect(await catalogReads(request)).toBe(warmed);

  for (let i = 0; i < 3; i++) await request.get("/api/catalog");
  expect(await catalogReads(request)).toBe(warmed);

  // Unknown skus are checked against the same cached entry.
  for (let i = 0; i < 3; i++) expect((await request.get("/shop/not-a-sku")).status()).toBe(404);
  expect(await catalogReads(request)).toBe(warmed);
});
