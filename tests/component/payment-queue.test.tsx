import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentQueue } from "@/features/payments/components/payment-queue";
import type { Payment } from "@/types/domain";

const lamp: Payment = {
  email: "ada@example.com",
  sku: "lamp",
  itemName: "Maple lamp",
  extraCode: null,
  externalChargeId: "ch_12345678",
  totalCents: 8000,
};
const stool: Payment = {
  email: "grace@example.com",
  sku: "stool",
  itemName: "Cedar stool",
  extraCode: "cushion",
  externalChargeId: "ch_stool0001",
  totalCents: 14500,
};

describe("PaymentQueue", () => {
  it("shows 'No payments recorded' under the 'Payment queue' heading when empty", () => {
    render(<PaymentQueue payments={[]} />);
    const queue = screen.getByRole("region", { name: "Payment queue" });
    expect(within(queue).getByText("No payments recorded")).toBeInTheDocument();
    expect(within(queue).queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists each payment's email, item name, total, and charge id, oldest first", () => {
    render(<PaymentQueue payments={[lamp, stool]} />);
    const queue = screen.getByRole("region", { name: "Payment queue" });
    expect(within(queue).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Email",
      "Item",
      "Total",
      "Charge id",
    ]);
    const rows = within(queue).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent))).toEqual([
      ["ada@example.com", "Maple lamp", "$80", "ch_12345678"],
      ["grace@example.com", "Cedar stool", "$145", "ch_stool0001"],
    ]);
    expect(within(queue).queryByText("No payments recorded")).not.toBeInTheDocument();
  });
});
