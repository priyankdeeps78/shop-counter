const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats integer cents as whole US dollars, e.g. 8000 -> "$80". */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
