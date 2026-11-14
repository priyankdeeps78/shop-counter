// Shared payment validation for the staff desk. Pure and client-safe: no server,
// React, or HTTP imports, so the desk form and both payment API routes use the
// exact same rules.
import { z } from "zod";
import {
  DESK_SKUS,
  type PaymentField,
  type PaymentFieldErrors,
  type Result,
  type ValidPayment,
} from "@/types/domain";

/** The exact messages the brief specifies, one per field. */
export const PAYMENT_ERRORS = {
  email: "Enter a valid email",
  sku: "Choose an item",
  externalChargeId: "Enter a charge id like ch_12345678",
  extraCode: "That extra is not sold with this item",
} as const satisfies Record<PaymentField, string>;

export const CHARGE_ID_PATTERN = /^ch_[A-Za-z0-9]{8,}$/;

/** Exactly one `@`, with at least one character on each side. Nothing stricter. */
function hasOneAtWithTextOnBothSides(email: string): boolean {
  const parts = email.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * The Zod schema behind `validatePayment`. Exported so the desk form can use it
 * with a resolver; servers must call `validatePayment`, which also guards
 * non-object input.
 */
export const paymentSchema = z
  .object({
    // Trimmed before the check, lowercased after it.
    email: z
      .string({ error: PAYMENT_ERRORS.email })
      .trim()
      .refine(hasOneAtWithTextOnBothSides, { error: PAYMENT_ERRORS.email })
      .transform((email) => email.toLowerCase()),
    sku: z.enum(DESK_SKUS, { error: PAYMENT_ERRORS.sku }),
    // Matched as given: no trimming, case-sensitive.
    externalChargeId: z
      .string({ error: PAYMENT_ERRORS.externalChargeId })
      .regex(CHARGE_ID_PATTERN, { error: PAYMENT_ERRORS.externalChargeId }),
    // Omitted, null, or "cushion"; any other value is an unsold extra.
    extraCode: z.literal("cushion", { error: PAYMENT_ERRORS.extraCode }).nullish(),
  })
  .refine(
    (payment) => payment.extraCode !== "cushion" || payment.sku === "stool",
    {
      error: PAYMENT_ERRORS.extraCode,
      path: ["extraCode"],
      // Zod skips object-level checks once any field has failed. Run this one
      // anyway, so "Cushion on Maple lamp" is reported together with other
      // field errors, unless `extraCode` itself already failed.
      when: (payload) =>
        typeof payload.value === "object" &&
        payload.value !== null &&
        payload.issues.every((issue) => issue.path?.[0] !== "extraCode"),
    },
  );

export type PaymentValidationResult = Result<ValidPayment, PaymentFieldErrors>;

const FIELDS = Object.keys(PAYMENT_ERRORS) as PaymentField[];

function isPaymentField(key: unknown): key is PaymentField {
  return FIELDS.includes(key as PaymentField);
}

/**
 * Checks a staff payment (`{ email, sku, externalChargeId, extraCode }`).
 *
 * Accepts any value, including malformed request bodies, and never throws for
 * bad input. Returns the normalised payment (trimmed, lowercased email;
 * `extraCode` `null` when omitted) or the message for each field that failed,
 * and only those fields.
 */
export function validatePayment(input: unknown): PaymentValidationResult {
  // A missing, null, array, or primitive body is treated as an empty form.
  const candidate =
    typeof input === "object" && input !== null && !Array.isArray(input) ? input : {};
  const parsed = paymentSchema.safeParse(candidate);

  if (parsed.success) {
    const { email, sku, externalChargeId, extraCode } = parsed.data;
    return { ok: true, value: { email, sku, externalChargeId, extraCode: extraCode ?? null } };
  }

  const errors: PaymentFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (isPaymentField(field)) errors[field] ??= PAYMENT_ERRORS[field];
  }
  return { ok: false, errors };
}
