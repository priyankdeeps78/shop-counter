import { invalidateCatalog } from "@/lib/catalog";
import { readJson } from "@/lib/http";
import { validatePayment } from "@/lib/payments/validate-payment";
import { recordPayment } from "@/lib/store";

/**
 * Records a desk payment. `externalChargeId` is the idempotency key:
 * a repeat answers 200 with the original payment and changes nothing.
 */
export async function POST(request: Request) {
  const result = validatePayment(await readJson(request));
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const outcome = recordPayment(result.value);
  switch (outcome.status) {
    case "sold_out":
      return Response.json({ ok: false, errors: { sku: "Sold out" } }, { status: 409 });
    case "replayed":
      return Response.json({ replayed: true, payment: outcome.payment }, { status: 200 });
    case "created":
      // Stock changed: drop the cached catalogue so /shop and /shop/<sku>
      // render the new remaining on their next request.
      invalidateCatalog();
      return Response.json({ replayed: false, payment: outcome.payment }, { status: 201 });
  }
}
