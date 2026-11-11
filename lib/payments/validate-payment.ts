import { z } from "zod";
import { DESK_SKUS, SEED_CATALOG, type DeskSku } from "../seed";

/**
 * The one validation function for staff desk payments.
 *
 * It is pure (no store access), so the same code runs in three places:
 * - the desk form, as the react-hook-form resolver (instant field errors),
 * - `POST /api/payments/preview`,
 * - `POST /api/payments`.
 * The server never trusts the browser's result; it calls this again.
 */

export const PAYMENT_MESSAGES = {
  email: "Enter a valid email",
  sku: "Choose an item",
  externalChargeId: "Enter a charge id like ch_12345678",
  extraCode: "That extra is not sold with this item",
} as const;

export type PaymentField = keyof typeof PAYMENT_MESSAGES;

export type PaymentInput = {
  email?: unknown;
  sku?: unknown;
  externalChargeId?: unknown;
  extraCode?: unknown;
};

export type ValidPayment = {
  email: string;
  sku: DeskSku;
  externalChargeId: string;
  extraCode: string | null;
};

export type PaymentErrors = Partial<Record<PaymentField, string>>;

export type PaymentValidation =
  | { ok: true; value: ValidPayment }
  | { ok: false; errors: PaymentErrors };

const emailSchema = z
  .string()
  .trim()
  .refine((value) => {
    const parts = value.split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  })
  .transform((value) => value.toLowerCase());

const skuSchema = z.enum(DESK_SKUS);

const chargeIdSchema = z
  .string()
  .trim()
  .regex(/^ch_[A-Za-z0-9]{8,}$/);

// Omitted, null and "" (the form's "None" option) all mean "no extra".
const extraCodeSchema = z
  .union([z.undefined(), z.null(), z.string().trim()])
  .transform((value) => (value ? value : null));

function extraIsSoldWith(sku: DeskSku, extraCode: string): boolean {
  const item = SEED_CATALOG.find((i) => i.sku === sku);
  return item?.extras.some((e) => e.code === extraCode) ?? false;
}

export function validatePayment(input: unknown): PaymentValidation {
  const raw: PaymentInput =
    input !== null && typeof input === "object" ? (input as PaymentInput) : {};

  const errors: PaymentErrors = {};

  const email = emailSchema.safeParse(raw.email);
  if (!email.success) errors.email = PAYMENT_MESSAGES.email;

  const sku = skuSchema.safeParse(raw.sku);
  if (!sku.success) errors.sku = PAYMENT_MESSAGES.sku;

  const chargeId = chargeIdSchema.safeParse(raw.externalChargeId);
  if (!chargeId.success) errors.externalChargeId = PAYMENT_MESSAGES.externalChargeId;

  const extra = extraCodeSchema.safeParse(raw.extraCode);
  if (!extra.success) {
    errors.extraCode = PAYMENT_MESSAGES.extraCode;
  } else if (extra.data !== null) {
    // An unknown code is always wrong. A known code is checked against the
    // item only once the item itself is valid, so "Choose an item" is not
    // shadowed by a second, confusing error.
    const knownSomewhere = SEED_CATALOG.some((i) =>
      i.extras.some((e) => e.code === extra.data),
    );
    if (!knownSomewhere || (sku.success && !extraIsSoldWith(sku.data, extra.data))) {
      errors.extraCode = PAYMENT_MESSAGES.extraCode;
    }
  }

  if (!email.success || !sku.success || !chargeId.success || !extra.success || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      email: email.data,
      sku: sku.data,
      externalChargeId: chargeId.data,
      extraCode: extra.data,
    },
  };
}
