import type { APIRequestContext } from "@playwright/test";

/** A charge id that is new in this server process: `ch_` + 14+ letters/digits. */
export function newChargeId(): string {
  return `ch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.replace(/[^A-Za-z0-9_]/g, "");
}

export async function liveStock(request: APIRequestContext, sku: string): Promise<number | null> {
  const catalog: { sku: string; remaining: number | null }[] = await (await request.get("/api/catalog")).json();
  return catalog.find((item) => item.sku === sku)!.remaining;
}

export async function catalogReads(request: APIRequestContext): Promise<number> {
  return (await (await request.get("/api/debug/reads")).json()).catalogReads;
}
