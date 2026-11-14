import type { Ref } from "react";
import { PanelEmpty, PanelHeading } from "@/components/workspace-panel";
import { ProductImage } from "@/features/catalog/components/product-image";
import { formatMoney } from "@/lib/format-money";
import { formatRemaining } from "@/lib/format-stock";
import type { PaymentPreview as Preview } from "@/types/domain";

export function PaymentPreview({
  headingId,
  headingRef,
  preview,
  pending,
}: {
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
  preview: Preview | null;
  pending: boolean;
}) {
  return (
    <section
      aria-labelledby={headingId}
      aria-live="polite"
      aria-busy={pending}
      className="surface-panel workspace-panel preview-panel"
    >
      <PanelHeading
        id={headingId}
        icon="≡"
        headingRef={headingRef}
        aside={preview && !pending ? <span className="workspace-tag">Preview only</span> : null}
      >
        Payment preview
      </PanelHeading>
      {pending ? (
        <div className="preview-placeholder">
          <p className="loading-status">Calculating preview…</p>
          <div aria-hidden="true" className="preview-skeleton">
            <span className="skeleton short-line" />
            <span className="skeleton thin-line" />
            <span className="skeleton short-line" />
          </div>
        </div>
      ) : preview ? (
        <div className="preview-content enter">
          <div className="preview-product">
            <ProductImage sku={preview.sku} className="cart-thumb" />
            <div>
              <p className="workspace-caption">Item</p>
              <p className="workspace-emphasis">{preview.itemName}</p>
            </div>
          </div>
          <dl className="workspace-facts">
            <div>
              <dt>Email</dt>
              <dd>{preview.email}</dd>
            </div>
            <div>
              <dt>Extra</dt>
              <dd>{preview.extraName ?? "None"}</dd>
            </div>
            <div>
              <dt>Remaining after</dt>
              <dd>{formatRemaining(preview.remainingAfter)}</dd>
            </div>
            <div className="workspace-total">
              <dt>Total</dt>
              <dd>{formatMoney(preview.totalCents)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <PanelEmpty icon="≡" title="No preview yet">
          Fill in the payment details and select Preview to see the total and remaining stock.
        </PanelEmpty>
      )}
    </section>
  );
}
