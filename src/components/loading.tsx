import { PanelHeading } from "@/components/workspace-panel";

export function LoadingStatus({ children }: { children: string }) {
  return <span role="status" className="loading-status">{children}</span>;
}

export function CatalogueLoading() {
  return (
    <div className="catalogue-loading">
      <div className="filter-bar" aria-hidden="true">
        <div className="filter-field">
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-control" />
        </div>
        <div className="filter-field">
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-control" />
        </div>
      </div>
      <p role="status" className="catalogue-loading-status">
        <span className="catalogue-loader-mark" aria-hidden="true">
          <span className="wordmark-icon" />
        </span>
        Loading the catalogue…
      </p>
      <div className="product-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="product-card product-skeleton">
            <span className="skeleton product-media" />
            <div className="product-card-info">
              <span className="skeleton thin-line" />
              <span className="skeleton short-line" />
              <div className="product-card-footer">
                <span className="skeleton short-line" />
                <span className="skeleton skeleton-arrow" />
              </div>
            </div>
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
