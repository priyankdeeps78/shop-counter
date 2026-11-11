import { readJson } from "@/lib/http";
import { validatePayment } from "@/lib/payments/validate-payment";
import { quotePayment } from "@/lib/store";

/** Validates and prices a desk payment. Writes nothing. */
export async function POST(request: Request) {
  const result = validatePayment(await readJson(request));
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const { value } = result;
  const quote = quotePayment(value);
  if (quote.remaining !== null && quote.remaining <= 0) {
    // Same answer the record endpoint would give, so the desk learns early.
    return Response.json({ ok: false, errors: { sku: "Sold out" } }, { status: 409 });
  }

  return Response.json({
    ok: true,
    preview: {
      email: value.email,
      sku: value.sku,
      itemName: quote.itemName,
      extraCode: value.extraCode,
      extraName: quote.extraName,
      totalCents: quote.totalCents,
      remainingAfter: quote.remaining === null ? null : quote.remaining - 1,
    },
  });
}
