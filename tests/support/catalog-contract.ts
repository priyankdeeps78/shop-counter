// `GET /api/catalog` exactly as the API contract shows it for a fresh store.
export const INITIAL_CATALOG = [
  { sku: "lamp", name: "Maple lamp", priceCents: 8000, remaining: 5, extras: [] },
  {
    sku: "stool",
    name: "Cedar stool",
    priceCents: 12000,
    remaining: 2,
    extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
  },
  { sku: "notebook", name: "Field notebook", priceCents: 1500, remaining: null, extras: [] },
  { sku: "pen", name: "Gel pen", priceCents: 400, remaining: null, extras: [] },
  { sku: "case", name: "Slip case", priceCents: 2200, remaining: null, extras: [] },
] as const;
