import { PanelHeading } from "@/components/workspace-panel";

export function LoadingStatus({ children }: { children: string }) {
  return <span role="status" className="loading-status">{children}</span>;
}

export function CatalogueLoading({ children = "Loading the catalogue…" }: { children?: string }) {
  return (
    <p role="status" className="catalogue-grid-loading">
      <span className="catalogue-loader-mark" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function CatalogueFiltersLoading() {
  return (
    <div className="filter-bar" aria-hidden="true">
      {["search", "sort"].map((field) => (
        <div key={field} className="filter-field">
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-control" />
        </div>
      ))}
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
