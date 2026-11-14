const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats integer cents as whole US dollars, e.g. 8000 → "$80", 14500 → "$145". */
export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}
