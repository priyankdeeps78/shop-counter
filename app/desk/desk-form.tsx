"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { useForm, useWatch, type FieldErrors, type Resolver } from "react-hook-form";
import { formatCents } from "@/lib/money";
import {
  validatePayment,
  type PaymentErrors,
  type PaymentField,
} from "@/lib/payments/validate-payment";
import type { Extra, Payment } from "@/lib/types";

export type DeskItem = { sku: string; name: string; priceCents: number; extras: Extra[] };

type DeskFormValues = {
  email: string;
  sku: string;
  extraCode: string;
  externalChargeId: string;
};

type Preview = {
  email: string;
  sku: string;
  itemName: string;
  extraCode: string | null;
  extraName: string | null;
  totalCents: number;
  remainingAfter: number | null;
};

type Notice = { tone: "success" | "info" | "error"; text: string };

const EMPTY: DeskFormValues = { email: "", sku: "", extraCode: "", externalChargeId: "" };

/**
 * The same `validatePayment` the API routes run, used as the form resolver,
 * so the browser shows exactly the errors the server would send back.
 */
const resolver: Resolver<DeskFormValues> = async (values) => {
  const result = validatePayment(values);
  if (result.ok) return { values, errors: {} };
  return { values: {}, errors: toFieldErrors(result.errors) };
};

function toFieldErrors(errors: PaymentErrors): FieldErrors<DeskFormValues> {
  const out: FieldErrors<DeskFormValues> = {};
  for (const [field, message] of Object.entries(errors) as [PaymentField, string][]) {
    out[field] = { type: "validate", message };
  }
  return out;
}

function toRequestBody(values: DeskFormValues) {
  return {
    email: values.email,
    sku: values.sku,
    externalChargeId: values.externalChargeId,
    extraCode: values.extraCode || null,
  };
}

async function post(url: string, values: DeskFormValues) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toRequestBody(values)),
  });
  return { status: res.status, body: await res.json() };
}

export function DeskForm({ items }: { items: DeskItem[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DeskFormValues>({ resolver, defaultValues: EMPTY });

  const sku = useWatch({ control, name: "sku" });
  const extrasForSku = items.find((i) => i.sku === sku)?.extras ?? [];
  const allExtras = uniqueExtras(items);

  function showServerErrors(body: { errors?: PaymentErrors }) {
    const fieldErrors = body.errors ?? {};
    for (const [field, message] of Object.entries(fieldErrors) as [PaymentField, string][]) {
      setError(field, { type: "server", message }, { shouldFocus: true });
    }
    if (Object.keys(fieldErrors).length === 0) {
      setNotice({ tone: "error", text: "Something went wrong. Try again." });
    }
  }

  const onPreview = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const { status, body } = await post("/api/payments/preview", values);
      if (status === 200) setPreview(body.preview);
      else showServerErrors(body);
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Try again." });
    }
  });

  const onRecord = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const { status, body } = await post("/api/payments", values);
      const payment: Payment | undefined = body.payment;
      if (status === 201 && payment) {
        setNotice({
          tone: "success",
          text: `Payment recorded: ${payment.itemName} for ${payment.email}, ${formatCents(payment.totalCents)}.`,
        });
        setPreview(null);
        reset(EMPTY);
        // Re-render the server parts (the queue) and drop any cached shop
        // pages this tab holds in its client router cache.
        router.refresh();
      } else if (status === 200 && payment) {
        setNotice({
          tone: "info",
          text: `Charge ${payment.externalChargeId} was already recorded (${payment.itemName} for ${payment.email}, ${formatCents(payment.totalCents)}). Nothing changed.`,
        });
      } else {
        showServerErrors(body);
      }
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Try again." });
    }
  });

  return (
    <>
      <form
        noValidate
        onSubmit={onRecord}
        // Any edit makes an earlier preview out of date.
        onChange={() => setPreview(null)}
        aria-describedby="desk-intro"
        className="mt-6 grid max-w-md gap-4"
      >
        <p id="desk-intro" className="text-stone-700">
          Record a payment taken for a lamp or a stool.
        </p>

        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="off"
              className="rounded border border-stone-400 px-2 py-1"
            />
          )}
        </Field>

        <Field label="Item" error={errors.sku?.message}>
          {(props) => (
            <select
              {...props}
              {...register("sku", {
                onChange: (event) => {
                  // Only the stool has a cushion: switching away clears it.
                  const next = items.find((i) => i.sku === event.target.value);
                  if (!next?.extras.length) setValue("extraCode", "");
                },
              })}
              className="rounded border border-stone-400 px-2 py-1"
            >
              <option value="">Choose…</option>
              {items.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.name} ({formatCents(item.priceCents)})
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Extra" error={errors.extraCode?.message}>
          {(props) => (
            <select {...props} {...register("extraCode")} className="rounded border border-stone-400 px-2 py-1">
              <option value="">None</option>
              {allExtras.map((extra) => (
                <option
                  key={extra.code}
                  value={extra.code}
                  disabled={!extrasForSku.some((e) => e.code === extra.code)}
                >
                  {extra.name} (+{formatCents(extra.priceCents)})
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Charge id" error={errors.externalChargeId?.message} hint="For example ch_12345678">
          {(props) => (
            <input
              {...props}
              {...register("externalChargeId")}
              type="text"
              autoComplete="off"
              spellCheck={false}
              className="rounded border border-stone-400 px-2 py-1 font-mono"
            />
          )}
        </Field>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPreview}
            disabled={isSubmitting}
            className="rounded border border-stone-500 px-4 py-2"
          >
            Preview
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-stone-900 px-4 py-2 text-white disabled:opacity-60"
          >
            Record payment
          </button>
        </div>

        <p
          role="status"
          className={
            notice?.tone === "error"
              ? "text-red-700"
              : notice?.tone === "success"
                ? "text-green-800"
                : "text-stone-800"
          }
        >
          {notice?.text}
        </p>
      </form>

      <section aria-labelledby="preview-heading" className="mt-8 max-w-md rounded border border-stone-300 p-4">
        <h2 id="preview-heading" className="text-xl font-semibold">
          Payment preview
        </h2>
        {preview ? (
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
            <dt className="font-medium">Email</dt>
            <dd>{preview.email}</dd>
            <dt className="font-medium">Item</dt>
            <dd>{preview.itemName}</dd>
            <dt className="font-medium">Extra</dt>
            <dd>{preview.extraName ?? "None"}</dd>
            <dt className="font-medium">Total</dt>
            <dd>{formatCents(preview.totalCents)}</dd>
            <dt className="font-medium">Remaining after</dt>
            <dd>{preview.remainingAfter ?? "Not stock-limited"}</dd>
          </dl>
        ) : (
          <p className="mt-3 text-stone-700">Press Preview to check a payment before recording it.</p>
        )}
      </section>
    </>
  );
}

function uniqueExtras(items: DeskItem[]): Extra[] {
  const byCode = new Map<string, Extra>();
  for (const item of items) for (const extra of item.extras) byCode.set(extra.code, extra);
  return [...byCode.values()];
}

type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-stone-700">
          {hint}
        </p>
      )}
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
