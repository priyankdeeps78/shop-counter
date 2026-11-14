import { expireCatalogCache } from "@/server/catalog";
import { json, readJsonBody } from "@/server/http";
import { recordPayment, rejectionStatus } from "@/server/payments";

/**
 * Records a staff payment (shared `validatePayment`, priced by the server).
 * 201 `{ replayed: false, payment }` — new charge: 1 taken off stock, queued.
 * 200 `{ replayed: true, payment }` — charge id seen before: the original payment, nothing changed.
 * 400 `{ ok: false, errors }` (failed fields only) · 409 `{ ok: false, errors: { sku: "Sold out" } }`.
 */
export async function POST(request: Request) {
  const outcome = recordPayment(await readJsonBody(request));
  if (!outcome.ok) {
    return json({ ok: false, errors: outcome.errors }, rejectionStatus(outcome.reason));
  }
  if (outcome.replayed) {
    return json({ replayed: true, payment: outcome.payment }, 200);
  }
  // Stock changed: the next request for /shop and /shop/<sku> must show it.
  expireCatalogCache();
  return json({ replayed: false, payment: outcome.payment }, 201);
}
