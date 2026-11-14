import { completeCheckout, orderToJson } from "@/server/checkout";
import { json, readJsonBody } from "@/server/http";

/**
 * Places the order for a checkout attempt, from its stored snapshot only.
 * 200 `{ orderId, attemptId, lines, amountCents }` (the same order on every repeat)
 * · 400 `{ error: "invalid_attempt" }` (no usable `attemptId`)
 * · 404 `{ error: "attempt_not_found" }`.
 */
export async function POST(request: Request) {
  const outcome = completeCheckout(await readJsonBody(request));
  if (outcome.ok) return json(orderToJson(outcome.order));
  return outcome.reason === "invalid"
    ? json({ error: "invalid_attempt" }, 400)
    : json({ error: "attempt_not_found" }, 404);
}
