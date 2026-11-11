import { stockLabel } from "@/lib/shop-query";

/** "5 left" / "Not stock-limited", tinted when stock runs low. */
export function StockBadge({ remaining }: { remaining: number | null }) {
  const tone =
    remaining === null
      ? "bg-moss-soft text-moss-dark"
      : remaining === 0
        ? "bg-danger-soft text-danger"
        : remaining <= 2
          ? "bg-honey-soft text-honey-ink"
          : "bg-line/70 text-ink";
  return (
    <span className={`pill ${tone}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {stockLabel(remaining)}
    </span>
  );
}
