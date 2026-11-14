import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductDetails } from "@/features/catalog/components/product-details";
import type { Product } from "@/types/domain";
import { INITIAL_CATALOG } from "../support/catalog-contract";

const product = (index: number) => structuredClone(INITIAL_CATALOG[index]) as unknown as Product;

describe("ProductDetails", () => {
  it("shows the name as the page heading, the price, stock, and extras", () => {
    render(<ProductDetails product={product(1)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Cedar stool" })).toBeInTheDocument();
    expect(screen.getByText("Price").nextElementSibling).toHaveTextContent("$120");
    expect(screen.getByText("Stock").nextElementSibling).toHaveTextContent("2 left");
    const extras = screen.getByRole("region", { name: "Extras" });
    expect(within(extras).getByRole("listitem")).toHaveTextContent("Cushion: $25");
  });

  it("says 'Not stock-limited' and 'No extras' where they apply", () => {
    render(<ProductDetails product={product(2)} />);
    expect(screen.getByText("Stock").nextElementSibling).toHaveTextContent("Not stock-limited");
    expect(within(screen.getByRole("region", { name: "Extras" })).getByText("No extras")).toBeInTheDocument();
  });

  it("shows sold-out stock as '0 left'", () => {
    const lamp = product(0);
    lamp.remaining = 0;
    render(<ProductDetails product={lamp} />);
    expect(screen.getByText("Stock").nextElementSibling).toHaveTextContent("0 left");
  });
});
