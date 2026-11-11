import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { formatCents } from "@/lib/money";
import { DESK_SKUS, SEED_CATALOG } from "@/lib/seed";
import { listPayments } from "@/lib/store";
import { DeskForm, type DeskItem } from "./desk-form";

export const metadata: Metadata = {
  title: "Staff desk",
  description: "Record a lamp or stool payment and see the payments recorded on this server.",
};

// Names and extras are fixed catalogue facts, so the form options are static.
// Stock is not needed here: the preview endpoint reports it live.
const deskItems: DeskItem[] = SEED_CATALOG.filter((item) =>
  (DESK_SKUS as readonly string[]).includes(item.sku),
).map(({ sku, name, priceCents, extras }) => ({ sku, name, priceCents, extras }));

export default function DeskPage() {
  return (
    <>
      <PageHeader eyebrow="Staff only" title="Staff desk">
        Check a counter payment, then record it once. Repeating a charge id never takes stock twice.
      </PageHeader>
      <DeskForm items={deskItems} />
      <section aria-labelledby="queue-heading" className="card mt-10 overflow-hidden">
        <div className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-4">
          <h2 id="queue-heading" className="font-display text-2xl font-semibold">
            Payment queue
          </h2>
          <p className="text-sm text-muted">This server, oldest first</p>
        </div>
        <Suspense fallback={<p className="px-6 py-8 text-muted">Loading payments…</p>}>
          <PaymentQueue />
        </Suspense>
      </section>
    </>
  );
}

function extraName(sku: string, code: string): string {
  return deskItems.find((i) => i.sku === sku)?.extras.find((e) => e.code === code)?.name ?? code;
}

/** Request-time: the queue is this process's live list, never cached. */
async function PaymentQueue() {
  await connection();
  const payments = listPayments();

  if (payments.length === 0) {
    return <p className="px-6 py-10 text-center text-muted">No payments recorded</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Payments recorded on this server, oldest first</caption>
        <thead>
          <tr className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
            <th scope="col" className="px-6 py-3 font-semibold">Email</th>
            <th scope="col" className="px-6 py-3 font-semibold">Item</th>
            <th scope="col" className="px-6 py-3 text-right font-semibold">Total</th>
            <th scope="col" className="px-6 py-3 font-semibold">Charge id</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.externalChargeId} className="border-t border-line">
              <td className="px-6 py-3.5">{p.email}</td>
              <td className="px-6 py-3.5 font-medium">
                {p.itemName}
                {p.extraCode ? ` with ${extraName(p.sku, p.extraCode)}` : ""}
              </td>
              <td className="px-6 py-3.5 text-right font-semibold tabular-nums">{formatCents(p.totalCents)}</td>
              <td className="px-6 py-3.5">
                <code className="rounded-md bg-paper px-2 py-1 font-mono text-xs">{p.externalChargeId}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
