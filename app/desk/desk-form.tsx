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

  const noticeTone = {
    success: "border-moss/30 bg-moss-soft text-moss-dark",
    info: "border-honey-ink/25 bg-honey-soft text-honey-ink",
    error: "border-danger/30 bg-danger-soft text-danger",
  };

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
      <form
        noValidate
        onSubmit={onRecord}
        // Any edit makes an earlier preview out of date.
        onChange={() => setPreview(null)}
        aria-describedby="desk-intro"
        className="card grid gap-5 p-6 sm:p-7"
      >
        <div>
          <h2 className="font-display text-2xl font-semibold">New payment</h2>
          <p id="desk-intro" className="mt-1 text-sm text-muted">
            Record a payment taken for a lamp or a stool.
          </p>
        </div>

        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <input
              {...props}
              {...register("email")}
              type="email"
              autoComplete="off"
              placeholder="customer@example.com"
              className="input"
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
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
                className="select"
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
              <select {...props} {...register("extraCode")} className="select">
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
        </div>

        <Field label="Charge id" error={errors.externalChargeId?.message} hint="For example ch_12345678">
          {(props) => (
            <input
              {...props}
              {...register("externalChargeId")}
              type="text"
              autoComplete="off"
              spellCheck={false}
              className="input font-mono"
            />
          )}
        </Field>

        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          <button type="button" onClick={onPreview} disabled={isSubmitting} className="btn-secondary">
            Preview
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            Record payment
          </button>
        </div>

        <p
          role="status"
          className={notice ? `rounded-xl border px-4 py-3 text-sm font-medium ${noticeTone[notice.tone]}` : "sr-only"}
        >
          {notice?.text}
        </p>
      </form>

      <section
        aria-labelledby="preview-heading"
        className="card overflow-hidden lg:sticky lg:top-24"
      >
        <div className="border-b border-dashed border-line-strong bg-paper/60 px-6 py-4">
          <h2 id="preview-heading" className="font-display text-xl font-semibold">
            Payment preview
          </h2>
        </div>
        {preview ? (
          <dl className="divide-y divide-line px-6 text-sm">
            <PreviewRow label="Email">{preview.email}</PreviewRow>
            <PreviewRow label="Item">{preview.itemName}</PreviewRow>
            <PreviewRow label="Extra">{preview.extraName ?? "None"}</PreviewRow>
            <PreviewRow label="Remaining after">{preview.remainingAfter ?? "Not stock-limited"}</PreviewRow>
            <PreviewRow label="Total" strong>
              {formatCents(preview.totalCents)}
            </PreviewRow>
          </dl>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-muted">Press Preview to check a payment before recording it.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PreviewRow({ label, strong, children }: { label: string; strong?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-3 ${strong ? "text-base" : ""}`}>
      <dt className={strong ? "font-display text-lg font-semibold" : "text-muted"}>{label}</dt>
      <dd className={strong ? "font-display text-2xl font-semibold tabular-nums" : "text-right font-medium"}>
        {children}
      </dd>
    </div>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-sm font-medium text-danger">
          <span aria-hidden="true">●</span>
          {error}
        </p>
      )}
    </div>
  );
}
