import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { QueueLoading } from "@/components/loading";
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
    <section aria-labelledby="page-heading" className="workspace enter">
      <header className="workspace-intro">
        <div>
          <h1 id="page-heading" className="display page-title">Desk</h1>
          <p>Review and record payments for the shop’s stock-limited items.</p>
        </div>
        <a className="button button-secondary" href="#payment-queue">
          View payment queue <span aria-hidden="true">↓</span>
        </a>
      </header>
      <DeskForm items={items} />
      <Suspense fallback={<QueueLoading />}>
        <LiveQueue />
      </Suspense>
    </section>
  );
}
