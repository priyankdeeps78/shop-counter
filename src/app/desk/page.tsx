import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { DeskForm, type DeskItem } from "@/features/payments/components/desk-form";
import { PaymentQueue } from "@/features/payments/components/payment-queue";
import { getCatalog } from "@/server/catalog";
import { getPaymentQueue } from "@/server/payments";
import { DESK_SKUS, type DeskSku } from "@/types/domain";

export const metadata: Metadata = {
  title: "Desk",
  description: "Staff desk: preview and record payments for lamps and stools, and see the payment queue.",
};

/**
 * The queue is live, per-request data from the in-memory store, so it renders at
 * request time (`connection()`), inside <Suspense> so the rest of the page can
 * still be prerendered. `router.refresh()` from the form re-renders it.
 */
async function LiveQueue() {
  await connection();
  return <PaymentQueue payments={getPaymentQueue()} />;
}

const isDeskSku = (sku: string): sku is DeskSku => (DESK_SKUS as readonly string[]).includes(sku);

export default async function DeskPage() {
  // Item names and extras come from the cached catalogue (they do not depend on stock).
  const items: DeskItem[] = (await getCatalog()).flatMap((product) =>
    isDeskSku(product.sku) ? [{ sku: product.sku, name: product.name, extras: product.extras }] : [],
  );

  return (
    <section aria-labelledby="page-heading" className="space-y-8">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Desk
      </h1>
      <DeskForm items={items} />
      <Suspense fallback={<p className="text-sm text-muted">Loading the payment queue…</p>}>
        <LiveQueue />
      </Suspense>
    </section>
  );
}
