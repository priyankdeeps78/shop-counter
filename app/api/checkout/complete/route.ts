import { completeSchema } from "@/lib/checkout";
import { readJson } from "@/lib/http";
import { completeAttempt } from "@/lib/store";

/**
 * Charges the stored attempt. Only `attemptId` is read from the body; the
 * order is built from the server snapshot, so line items sent here are ignored.
 */
export async function POST(request: Request) {
  const parsed = completeSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const order = completeAttempt(parsed.data.attemptId);
  if (!order) {
    return Response.json({ error: "attempt_not_found" }, { status: 404 });
  }
  return Response.json(order);
}
