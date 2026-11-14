// Response bodies of the payment routes, as the desk form reads them.
import type { Payment, PaymentFieldErrors, PaymentPreview } from "@/types/domain";

export type ErrorBody = { ok: false; errors: PaymentFieldErrors };
export type PreviewBody = { ok: true; preview: PaymentPreview } | ErrorBody;
export type RecordBody = { replayed: boolean; payment: Payment } | ErrorBody;
