import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Checkout, type Product } from "@/app/checkout/checkout";
import { CART_CHANGED_MESSAGE } from "@/lib/cart";
import { routeFetch } from "./route-fetch";

const products: Product[] = [
  { sku: "notebook", name: "Field notebook", priceCents: 1500 },
  { sku: "pen", name: "Gel pen", priceCents: 400 },
  { sku: "case", name: "Slip case", priceCents: 2200 },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(routeFetch));
});

describe("Checkout", () => {
  it("charges the cart as it was when Pay was pressed (divergence)", async () => {
    const user = userEvent.setup();
    render(<Checkout products={products} />);

    await user.click(screen.getByRole("button", { name: "Add Field notebook" }));
    expect(screen.getByLabelText("Cart total")).toHaveTextContent("$15");

    await user.click(screen.getByRole("button", { name: "Pay" }));
    const inProgress = await screen.findByRole("region", { name: "Payment in progress" });
    expect(within(inProgress).getByLabelText("Amount due")).toHaveTextContent("$15");
    expect(screen.queryByText(CART_CHANGED_MESSAGE)).not.toBeInTheDocument();

    // The cart stays editable after Pay.
    await user.click(screen.getByRole("button", { name: "Add Gel pen" }));
    expect(screen.getByLabelText("Cart total")).toHaveTextContent("$19");
    expect(within(inProgress).getByLabelText("Amount due")).toHaveTextContent("$15");
    expect(screen.getByText(CART_CHANGED_MESSAGE)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete payment" }));
    const placed = await screen.findByRole("region", { name: "Order placed" });
    expect(within(placed).getByLabelText("Amount charged")).toHaveTextContent("$15");
    const lines = within(placed).getAllByRole("listitem");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveTextContent("Field notebook × 1");
    expect(placed).not.toHaveTextContent("Gel pen");

    // The complete request carried only the attempt id.
    const completeCall = vi.mocked(fetch).mock.calls.find(([url]) => url === "/api/checkout/complete");
    expect(JSON.parse(String(completeCall?.[1]?.body))).toEqual({ attemptId: expect.any(String) });
  });

  it("asks for an item when Pay is pressed with an empty cart, and starts nothing", async () => {
    const user = userEvent.setup();
    render(<Checkout products={products} />);

    await user.click(screen.getByRole("button", { name: "Pay" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Add an item before paying");
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Payment in progress" })).not.toBeInTheDocument();
  });

  it("lets a line be increased, decreased and removed, updating the total", async () => {
    const user = userEvent.setup();
    render(<Checkout products={products} />);

    await user.click(screen.getByRole("button", { name: "Add Slip case" }));
    await user.click(screen.getByRole("button", { name: "Increase Slip case" }));
    expect(screen.getByLabelText("Quantity of Slip case")).toHaveTextContent("2");
    expect(screen.getByLabelText("Cart total")).toHaveTextContent("$44");

    await user.click(screen.getByRole("button", { name: "Decrease Slip case" }));
    expect(screen.getByLabelText("Cart total")).toHaveTextContent("$22");

    await user.click(screen.getByRole("button", { name: "Remove Slip case" }));
    expect(screen.getByLabelText("Cart total")).toHaveTextContent("$0");
    expect(screen.getByRole("button", { name: "Add Slip case" })).toBeInTheDocument();
  });

  it("clears the warning when the cart goes back to the snapshot", async () => {
    const user = userEvent.setup();
    render(<Checkout products={products} />);

    await user.click(screen.getByRole("button", { name: "Add Gel pen" }));
    await user.click(screen.getByRole("button", { name: "Pay" }));
    await screen.findByRole("region", { name: "Payment in progress" });

    await user.click(screen.getByRole("button", { name: "Increase Gel pen" }));
    expect(screen.getByText(CART_CHANGED_MESSAGE)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Decrease Gel pen" }));
    expect(screen.queryByText(CART_CHANGED_MESSAGE)).not.toBeInTheDocument();
  });
});
