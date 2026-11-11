import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
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
      <h1 className="text-2xl font-semibold">Staff desk</h1>
      <DeskForm items={deskItems} />
      <section aria-labelledby="queue-heading" className="mt-10">
        <h2 id="queue-heading" className="text-xl font-semibold">
          Payment queue
        </h2>
        <Suspense fallback={<p className="mt-4">Loading payments…</p>}>
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
    return <p className="mt-4">No payments recorded</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Payments recorded on this server, oldest first</caption>
        <thead>
          <tr className="border-b border-stone-300">
            <th scope="col" className="py-2 pr-4">Email</th>
            <th scope="col" className="py-2 pr-4">Item</th>
            <th scope="col" className="py-2 pr-4">Total</th>
            <th scope="col" className="py-2">Charge id</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.externalChargeId} className="border-b border-stone-200">
              <td className="py-2 pr-4">{p.email}</td>
              <td className="py-2 pr-4">
                {p.itemName}
                {p.extraCode ? ` with ${extraName(p.sku, p.extraCode)}` : ""}
              </td>
              <td className="py-2 pr-4">{formatCents(p.totalCents)}</td>
              <td className="py-2 font-mono">{p.externalChargeId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
