import { json, readJsonBody } from "@/server/http";
import { previewPayment, rejectionStatus } from "@/server/payments";

/**
 * Shows what recording a payment would do. Validates (shared `validatePayment`)
 * and prices from the live store; writes nothing.
 * 200 `{ ok: true, preview }` · 400 `{ ok: false, errors }` (failed fields only)
 * · 409 `{ ok: false, errors: { sku: "Sold out" } }`.
 */
export async function POST(request: Request) {
  const outcome = previewPayment(await readJsonBody(request));
  if (!outcome.ok) {
    return json({ ok: false, errors: outcome.errors }, rejectionStatus(outcome.reason));
  }
  return json({ ok: true, preview: outcome.preview });
}
