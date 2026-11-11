import { priceCart } from "@/lib/checkout";
import { readJson } from "@/lib/http";
import { createAttempt } from "@/lib/store";

/** Freezes the cart as it is now into a server-priced attempt. */
export async function POST(request: Request) {
  const lines = priceCart(await readJson(request));
  if (!lines) {
    return Response.json({ error: "invalid_cart" }, { status: 400 });
  }
  return Response.json(createAttempt(lines), { status: 201 });
}
