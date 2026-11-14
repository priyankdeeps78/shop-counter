import { beforeEach, describe, expect, it } from "vitest";
import { POST as begin } from "@/app/api/checkout/begin/route";
import * as completeRoute from "@/app/api/checkout/complete/route";
import { getStore, resetStore } from "@/server/store";

const request = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const complete = (body: unknown) => completeRoute.POST(request("/api/checkout/complete", body));
async function startNotebookAttempt(): Promise<string> {
  const response = await begin(request("/api/checkout/begin", { lines: [{ sku: "notebook", qty: 1 }] }));
  return (await response.json()).attemptId;
}
const NOTEBOOK_LINES = [{ sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 }];

beforeEach(() => {
  resetStore();
});

describe("POST /api/checkout/complete", () => {
  it("answers 200 with the brief's shape, built from the snapshot", async () => {
    const attemptId = await startNotebookAttempt();
    const response = await complete({ attemptId });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toStrictEqual({ orderId: expect.any(String), attemptId, lines: NOTEBOOK_LINES, amountCents: 1500 });
    expect(Object.keys(body)).toEqual(["orderId", "attemptId", "lines", "amountCents"]);
    expect(body.orderId).not.toBe(attemptId);
  });

  it("ignores line items and amounts in the body (worked example: a pen added after Pay)", async () => {
    const attemptId = await startNotebookAttempt();
    const response = await complete({
      attemptId,
      lines: [
        { sku: "notebook", qty: 1 },
        { sku: "pen", qty: 1 },
      ],
      amountCents: 1900,
    });
    expect(await response.json()).toMatchObject({ lines: NOTEBOOK_LINES, amountCents: 1500 });
  });

  it("returns the same order when the same attempt is completed again", async () => {
    const attemptId = await startNotebookAttempt();
    const first = await (await complete({ attemptId })).json();
    const again = await complete({ attemptId });
    expect(again.status).toBe(200);
    expect(await again.json()).toStrictEqual(first);
    expect(getStore().ordersByAttemptId.size).toBe(1);
  });

  it("answers 404 { error: 'attempt_not_found' } for an unknown attempt", async () => {
    const response = await complete({ attemptId: "no-such-attempt" });
    expect(response.status).toBe(404);
    expect(await response.json()).toStrictEqual({ error: "attempt_not_found" });
  });

  it.each([
    ["no attemptId", {}],
    ["a numeric attemptId", { attemptId: 7 }],
    ["broken JSON", "{"],
  ])("answers 400 { error: 'invalid_attempt' } for %s", async (_label, body) => {
    const response = await complete(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toStrictEqual({ error: "invalid_attempt" });
  });

  it("exposes only POST", () => {
    expect(Object.keys(completeRoute)).toEqual(["POST"]);
  });
});
