import type { Sku } from "@/types/domain";

export const PRODUCT_PRESENTATION = {
  lamp: {
    category: "Lighting",
    description: "A turned maple base and a linen shade bring warm light to a bedside table, a shelf, or a reading corner.",
  },
  stool: {
    category: "Furniture",
    description: "Solid cedar and a woven seat give this low stool a place beside the sofa, by the door, or wherever you need an extra seat.",
  },
  notebook: {
    category: "Stationery",
    description: "A compact, cloth-covered notebook for daily notes, quick lists, and ideas you want to keep close.",
  },
  pen: {
    category: "Stationery",
    description: "A retractable gel pen for everyday writing, with a dark green barrel and a clip for your pocket or notebook.",
  },
  case: {
    category: "Stationery",
    description: "A slim canvas sleeve for carrying the small things you reach for throughout the day.",
  },
} as const satisfies Record<Sku, { category: string; description: string }>;
