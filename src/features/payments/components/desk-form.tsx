"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { PanelHeading } from "@/components/workspace-panel";
import { PaymentPreview } from "@/features/payments/components/payment-preview";
import type { PreviewBody, RecordBody } from "@/features/payments/lib/payment-api";
import { postJson } from "@/lib/post-json";
import { validatePayment } from "@/features/payments/lib/payment-validation";
import { formatMoney } from "@/lib/format-money";
import type {
  DeskSku,
  Extra,
  ExtraCode,
  PaymentField,
  PaymentFieldErrors,
  PaymentPreview as Preview,
} from "@/types/domain";

export type DeskItem = { sku: DeskSku; name: string; extras: readonly Extra[] };

/** What the inputs hold. `""` means "nothing chosen" for the two selects. */
type DeskFormValues = {
  email: string;
  sku: DeskSku | "";
  extraCode: ExtraCode | "";
  externalChargeId: string;
};

const EMPTY_FORM: DeskFormValues = { email: "", sku: "", extraCode: "", externalChargeId: "" };
const NETWORK_ERROR = "Could not reach the server. Nothing was recorded. Try again.";

/** The request body both payment routes expect; "None" becomes `null`. */
function toPayload(values: DeskFormValues) {
  return {
    email: values.email,
    sku: values.sku === "" ? undefined : values.sku,
    externalChargeId: values.externalChargeId,
    extraCode: values.extraCode === "" ? null : values.extraCode,
  };
}

function toFieldErrors(errors: PaymentFieldErrors): FieldErrors<DeskFormValues> {
  const fieldErrors: FieldErrors<DeskFormValues> = {};
  for (const [field, message] of Object.entries(errors) as [PaymentField, string][]) {
    fieldErrors[field] = { type: "validate", message };
  }
  return fieldErrors;
}

/** Same rules and messages as the server: the resolver calls the shared `validatePayment`. */
const resolver: Resolver<DeskFormValues> = async (values) => {
  const result = validatePayment(toPayload(values));
  return result.ok ? { values, errors: {} } : { values: {}, errors: toFieldErrors(result.errors) };
};

type Status = { tone: "success" | "error"; text: string } | null;

export function DeskForm({ items }: { items: readonly DeskItem[] }) {
  const router = useRouter();
  const ids = useId();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!preview) return;
    if (document.activeElement === previewButton.current || document.activeElement === document.body) {
      previewHeading.current?.focus();
    }
  }, [preview]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    subscribe,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DeskFormValues>({ defaultValues: EMPTY_FORM, resolver });

  const sku = useWatch({ control, name: "sku" });
  const extrasForItem = items.find((item) => item.sku === sku)?.extras ?? [];

  // Any edit makes an earlier preview out of date.
  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: () => setPreview(null),
      }),
    [subscribe],
  );

  function showServerErrors(fieldErrors: PaymentFieldErrors) {
    const fields = Object.entries(fieldErrors) as [PaymentField, string][];
    fields.forEach(([field, message], index) =>
      setError(field, { type: "server", message }, { shouldFocus: index === 0 }),
    );
  }

  const runPreview = handleSubmit(async (values) => {
    setStatus(null);
    setPreview(null);
    setPreviewPending(true);
    const sent = JSON.stringify(toPayload(values));
    try {
      const body = await postJson<PreviewBody>("/api/payments/preview", toPayload(values));
      // The form changed while waiting: this preview would describe old values.
      if (JSON.stringify(toPayload(getValues())) !== sent) return;
      if (body.ok) setPreview(body.preview);
      else showServerErrors(body.errors);
    } catch {
      setStatus({ tone: "error", text: NETWORK_ERROR });
    } finally {
      setPreviewPending(false);
    }
  });

  const runRecord = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const body = await postJson<RecordBody>("/api/payments", toPayload(values));
      if (!("payment" in body)) {
        showServerErrors(body.errors);
        return;
      }
      const { payment, replayed } = body;
      reset(EMPTY_FORM);
      setPreview(null);
      setStatus({
        tone: "success",
        text: replayed
          ? `Charge ${payment.externalChargeId} was already recorded (${payment.itemName}, ${formatMoney(payment.totalCents)}). Nothing was charged again.`
          : `Payment recorded: ${payment.itemName}, ${formatMoney(payment.totalCents)}, ${payment.externalChargeId}.`,
      });
      // Re-render the queue on the server and drop cached pages in this browser,
      // so the shop shows the new stock on the next visit (including Back).
      router.refresh();
    } catch {
      setStatus({ tone: "error", text: NETWORK_ERROR });
    }
  });

  const fieldId = (name: keyof DeskFormValues) => `${ids}-${name}`;
  const errorId = (name: keyof DeskFormValues) => `${ids}-${name}-error`;
  const describedBy = (name: keyof DeskFormValues) => (errors[name] ? errorId(name) : undefined);
  const fieldError = (name: keyof DeskFormValues) =>
    errors[name] ? (
      <p id={errorId(name)} className="text-sm font-medium text-red-700">
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <div className="desk-grid">
      <form onSubmit={runRecord} noValidate aria-labelledby={`${ids}-heading`} className="surface-panel workspace-panel desk-form">
        <PanelHeading id={`${ids}-heading`} icon="+">
          Record a payment
        </PanelHeading>

        <div className="desk-fields">
          <div className="desk-wide-field space-y-1">
            <label htmlFor={fieldId("email")} className="block text-sm font-medium">
              Email
            </label>
            <input
              id={fieldId("email")}
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy("email")}
              className="field-control"
              {...register("email")}
            />
            {fieldError("email")}
          </div>

          <div className="space-y-1">
            <label htmlFor={fieldId("sku")} className="block text-sm font-medium">
              Item
            </label>
            <select
              id={fieldId("sku")}
              aria-invalid={errors.sku ? true : undefined}
              aria-describedby={describedBy("sku")}
              className="field-control"
              {...register("sku", {
                // An extra the newly chosen item does not sell is cleared (lamp clears Cushion).
                onChange: (event: { target: { value: string } }) => {
                  const item = items.find((candidate) => candidate.sku === event.target.value);
                  const extra = getValues("extraCode");
                  if (extra && !item?.extras.some((candidate) => candidate.code === extra)) {
                    setValue("extraCode", "");
                  }
                },
              })}
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.name}
                </option>
              ))}
            </select>
            {fieldError("sku")}
          </div>

          <div className="space-y-1">
            <label htmlFor={fieldId("extraCode")} className="block text-sm font-medium">
              Extra
            </label>
            <select
              id={fieldId("extraCode")}
              aria-invalid={errors.extraCode ? true : undefined}
              aria-describedby={describedBy("extraCode")}
              className="field-control"
              {...register("extraCode")}
            >
              <option value="">None</option>
              {extrasForItem.map((extra) => (
                <option key={extra.code} value={extra.code}>
                  {extra.name} (+{formatMoney(extra.priceCents)})
                </option>
              ))}
            </select>
            {fieldError("extraCode")}
          </div>

          <div className="desk-wide-field space-y-1">
            <label htmlFor={fieldId("externalChargeId")} className="block text-sm font-medium">
              Charge id
            </label>
            <input
              id={fieldId("externalChargeId")}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="ch_12345678"
              aria-invalid={errors.externalChargeId ? true : undefined}
              aria-describedby={describedBy("externalChargeId")}
              className="field-control font-mono"
              {...register("externalChargeId")}
            />
            {fieldError("externalChargeId")}
          </div>
        </div>

        <div className="desk-actions">
          <button
            type="button"
            ref={previewButton}
            onClick={runPreview}
            disabled={isSubmitting}
            className="button button-secondary"
          >
            Preview
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button button-primary"
          >
            Record payment
          </button>
        </div>

        <p
          role="status"
          className={`desk-status text-sm font-medium ${isSubmitting ? "loading-status" : status?.tone === "error" ? "text-red-700" : "text-green-800"}`}
        >
          {isSubmitting ? "Working…" : status?.text}
        </p>
      </form>

      <PaymentPreview
        headingId={`${ids}-preview-heading`}
        headingRef={previewHeading}
        preview={preview}
        pending={previewPending}
      />
    </div>
  );
}
