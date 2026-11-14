import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CART_CHANGED_MESSAGE,
  CheckoutClient,
  EMPTY_CART_MESSAGE,
  type CheckoutProduct,
} from "@/features/checkout/components/checkout-client";

const PRODUCTS: CheckoutProduct[] = [
  { sku: "notebook", name: "Field notebook", priceCents: 1500 },
  { sku: "pen", name: "Gel pen", priceCents: 400 },
  { sku: "case", name: "Slip case", priceCents: 2200 },
];
const NOTEBOOK_LINE = { sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 };

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
const cartTotal = () => screen.getByLabelText("Cart total");
const click = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) =>
  user.click(screen.getByRole("button", { name }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CheckoutClient", () => {
  it("adds, changes, and removes lines; Cart total updates immediately", async () => {
    const user = userEvent.setup();
    render(<CheckoutClient products={PRODUCTS} />);
    expect(cartTotal()).toHaveTextContent("$0");

    await click(user, "Add Field notebook");
    expect(screen.getByLabelText("Field notebook quantity")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Increase Field notebook" })).toHaveFocus();
    await click(user, "Increase Field notebook");
    await click(user, "Add Gel pen");
    expect(cartTotal()).toHaveTextContent("$34");

    await click(user, "Decrease Field notebook");
    expect(cartTotal()).toHaveTextContent("$19");
    await click(user, "Decrease Field notebook"); // 1 → 0 removes the line
    expect(screen.getByRole("button", { name: "Add Field notebook" })).toHaveFocus();
    await click(user, "Remove Gel pen");
    expect(cartTotal()).toHaveTextContent("$0");
  });

  it("Pay with an empty cart says 'Add an item before paying' and sends nothing", async () => {
    const user = userEvent.setup();
    render(<CheckoutClient products={PRODUCTS} />);
    await click(user, "Pay");
    expect(screen.getByText(EMPTY_CART_MESSAGE, { exact: true })).toHaveAttribute("role", "status");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Payment in progress" })).not.toBeInTheDocument();
  });

  it("keeps the snapshot after Pay, flags a changed cart until it matches again, and completes with only the attempt id", async () => {
    const user = userEvent.setup();
    render(<CheckoutClient products={PRODUCTS} />);
    await click(user, "Add Field notebook");

    reply({ attemptId: "a-1", lines: [NOTEBOOK_LINE], amountCents: 1500 });
    await click(user, "Pay");
    const progress = await screen.findByRole("region", { name: "Payment in progress" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toStrictEqual({ lines: [{ sku: "notebook", qty: 1 }] });
    expect(within(progress).queryByText(CART_CHANGED_MESSAGE)).not.toBeInTheDocument();

    await click(user, "Add Gel pen");
    expect(cartTotal()).toHaveTextContent("$19");
    expect(screen.getByLabelText("Amount due")).toHaveTextContent("$15");
    expect(within(progress).getByText(CART_CHANGED_MESSAGE)).toHaveAttribute("role", "status");

    await click(user, "Remove Gel pen"); // back to the snapshot's lines
    expect(within(progress).queryByText(CART_CHANGED_MESSAGE)).not.toBeInTheDocument();
    await click(user, "Add Gel pen");

    reply({ orderId: "o-1", attemptId: "a-1", lines: [NOTEBOOK_LINE], amountCents: 1500 });
    await click(user, "Complete payment");
    const order = await screen.findByRole("region", { name: "Order placed" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/checkout/complete");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toStrictEqual({ attemptId: "a-1" });
    expect(within(order).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Field notebook × 1 — $15"]);
    expect(screen.getByLabelText("Amount charged")).toHaveTextContent("$15");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Order placed" })).toHaveFocus());
  });
});
