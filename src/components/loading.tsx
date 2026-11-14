import { PanelHeading } from "@/components/workspace-panel";

export function LoadingStatus({ children }: { children: string }) {
  return <span role="status" className="loading-status">{children}</span>;
}

export function CatalogueLoading() {
  return (
    <div className="catalogue-loading">
      <LoadingStatus>Loading the catalogue…</LoadingStatus>
      <div className="filter-bar" aria-hidden="true">
        <span className="skeleton skeleton-control" />
        <span className="skeleton skeleton-control" />
      </div>
      <div className="product-grid" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="product-skeleton">
            <div className="skeleton product-media" />
            <div className="skeleton short-line" />
            <div className="skeleton thin-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function QueueLoading() {
  return (
    <div id="payment-queue" className="surface-panel workspace-panel queue-panel">
      <PanelHeading id="payment-queue-heading" icon="≡">Payment queue</PanelHeading>
      <div className="preview-placeholder">
        <LoadingStatus>Loading the payment queue…</LoadingStatus>
        <div className="queue-skeleton" aria-hidden="true">
          <span className="skeleton short-line" />
          <span className="skeleton short-line" />
          <span className="skeleton short-line" />
        </div>
      </div>
    </div>
  );
}
