import { PanelEmpty, PanelHeading } from "@/components/workspace-panel";
import { formatMoney } from "@/lib/format-money";
import type { Payment } from "@/types/domain";

/** The recorded payments, oldest first. Presentational: data comes from the server. */
export function PaymentQueue({ payments }: { payments: readonly Payment[] }) {
  const totalCents = payments.reduce((total, payment) => total + payment.totalCents, 0);

  return (
    <section
      id="payment-queue"
      tabIndex={-1}
      aria-labelledby="payment-queue-heading"
      className="surface-panel workspace-panel queue-panel"
    >
      <PanelHeading
        id="payment-queue-heading"
        icon="≡"
        aside={<span className="workspace-tag">{payments.length} recorded</span>}
      >
        Payment queue
      </PanelHeading>
      {payments.length === 0 ? (
        <PanelEmpty icon="↳" title="No payments recorded">
          Recorded payments will appear here with their totals and charge IDs.
        </PanelEmpty>
      ) : (
        <>
          <div className="queue-table">
            <table role="table" aria-label="Recorded payments">
              <thead role="rowgroup">
                <tr role="row">
                  <th role="columnheader" scope="col">Email</th>
                  <th role="columnheader" scope="col">Item</th>
                  <th role="columnheader" scope="col">Total</th>
                  <th role="columnheader" scope="col">Charge id</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {payments.map((payment) => (
                  <tr key={payment.externalChargeId} role="row">
                    <td role="cell" className="queue-email" data-label="Email">{payment.email}</td>
                    <td role="cell" data-label="Item">{payment.itemName}</td>
                    <td role="cell" className="queue-amount" data-label="Total">{formatMoney(payment.totalCents)}</td>
                    <td role="cell" data-label="Charge id"><code>{payment.externalChargeId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="queue-total"><span>Total recorded</span> <strong>{formatMoney(totalCents)}</strong></p>
        </>
      )}
    </section>
  );
}
