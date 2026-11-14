// Client-side calls to the payment routes. Client-safe: no server imports.
import type { Payment, PaymentFieldErrors, PaymentPreview } from "@/types/domain";

export type ErrorBody = { ok: false; errors: PaymentFieldErrors };
export type PreviewBody = { ok: true; preview: PaymentPreview } | ErrorBody;
export type RecordBody = { replayed: boolean; payment: Payment } | ErrorBody;

/** POSTs JSON and returns the parsed JSON body. Throws on network failure or a non-JSON reply. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as T;
}
