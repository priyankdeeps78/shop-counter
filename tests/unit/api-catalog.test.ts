import { beforeEach, describe, expect, it } from "vitest";
import { GET as getCatalogRoute } from "@/app/api/catalog/route";
import { GET as getReadsRoute } from "@/app/api/debug/reads/route";
import { getStore, resetStore } from "@/server/store";
import { INITIAL_CATALOG } from "../support/catalog-contract";

beforeEach(() => {
  resetStore();
});

describe("GET /api/catalog", () => {
  it("answers 200 with the bare catalogue array and no-store caching", async () => {
    const response = await getCatalogRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toStrictEqual(INITIAL_CATALOG);
  });

  it("reads the live store, so later stock changes show up", async () => {
    getStore().products.get("stool")!.remaining = 1;
    const body = await (await getCatalogRoute()).json();
    expect(body[1]).toMatchObject({ sku: "stool", remaining: 1 });
  });

  it("never increments catalogReads", async () => {
    getStore().catalogReads = 7;
    await getCatalogRoute();
    await getCatalogRoute();
    const body = await (await getReadsRoute()).json();
    expect(body).toStrictEqual({ catalogReads: 7 });
  });
});

describe("GET /api/debug/reads", () => {
  it("answers exactly { catalogReads: <n> } with no-store caching", async () => {
    const response = await getReadsRoute();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toStrictEqual({ catalogReads: 0 });
  });
});
