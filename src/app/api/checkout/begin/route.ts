import { attemptToJson, beginCheckout } from "@/server/checkout";
import { json, readJsonBody } from "@/server/http";

/**
 * Freezes the cart as it is when Pay is pressed, priced by the server.
 * 200 `{ attemptId, lines: [{ sku, name, unitPriceCents, qty }], amountCents }`
 * · 400 `{ error: "invalid_cart" }`.
 */
export async function POST(request: Request) {
  const outcome = beginCheckout(await readJsonBody(request));
  if (!outcome.ok) return json({ error: "invalid_cart" }, 400);
  return json(attemptToJson(outcome.attempt));
}
