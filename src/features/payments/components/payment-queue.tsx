import { formatMoney } from "@/lib/format-money";
import type { Payment } from "@/types/domain";

/** The recorded payments, oldest first. Presentational: data comes from the server. */
export function PaymentQueue({ payments }: { payments: readonly Payment[] }) {
  return (
    <section aria-labelledby="payment-queue-heading" className="space-y-3">
      <h2 id="payment-queue-heading" className="text-lg font-semibold">
        Payment queue
      </h2>
      {payments.length === 0 ? (
        <p className="text-muted">No payments recorded</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Email</th>
                <th scope="col" className="px-3 py-2 font-medium">Item</th>
                <th scope="col" className="px-3 py-2 font-medium">Total</th>
                <th scope="col" className="px-3 py-2 font-medium">Charge id</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.externalChargeId} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 break-all">{payment.email}</td>
                  <td className="px-3 py-2">{payment.itemName}</td>
                  <td className="px-3 py-2">{formatMoney(payment.totalCents)}</td>
                  <td className="px-3 py-2 font-mono break-all">{payment.externalChargeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
