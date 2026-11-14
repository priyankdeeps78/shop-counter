import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeskForm, type DeskItem } from "@/features/payments/components/desk-form";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const ITEMS: DeskItem[] = [
  { sku: "lamp", name: "Maple lamp", extras: [] },
  { sku: "stool", name: "Cedar stool", extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }] },
];
const LAMP_PREVIEW = {
  ok: true,
  preview: {
    email: "ada@example.com",
    sku: "lamp",
    itemName: "Maple lamp",
    extraCode: null,
    extraName: null,
    totalCents: 8000,
    remainingAfter: 4,
  },
};
const LAMP_PAYMENT = {
  email: "ada@example.com",
  sku: "lamp",
  itemName: "Maple lamp",
  extraCode: null,
  externalChargeId: "ch_12345678",
  totalCents: 8000,
};

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

const email = () => screen.getByLabelText("Email");
const item = () => screen.getByLabelText("Item");
const extra = () => screen.getByLabelText("Extra");
const chargeId = () => screen.getByLabelText("Charge id");
const previewRegion = () => screen.getByRole("region", { name: "Payment preview" });
const status = () => screen.getByRole("status");

async function fillLamp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(email(), "  Ada@Example.com ");
  await user.selectOptions(item(), "lamp");
  await user.type(chargeId(), "ch_12345678");
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  router.refresh.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeskForm — fields", () => {
  it("has labelled Email, Item, Extra, and Charge id fields and both actions", () => {
    render(<DeskForm items={ITEMS} />);
    expect(email()).toHaveAttribute("type", "email");
    expect(chargeId()).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record payment" })).toHaveAttribute("type", "submit");
  });

  it("offers only Maple lamp and Cedar stool as items", () => {
    render(<DeskForm items={ITEMS} />);
    const items = within(item()).getAllByRole("option").filter((option) => option.getAttribute("value"));
    expect(items.map((option) => option.textContent)).toEqual(["Maple lamp", "Cedar stool"]);
  });

  it("offers the Cushion only once Cedar stool is chosen", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={ITEMS} />);
    expect(within(extra()).getAllByRole("option").map((option) => option.textContent)).toEqual(["None"]);
    await user.selectOptions(item(), "stool");
    expect(within(extra()).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "None",
      "Cushion (+$25)",
    ]);
  });

  it("clears a chosen Cushion when Maple lamp is chosen", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={ITEMS} />);
    await user.selectOptions(item(), "stool");
    await user.selectOptions(extra(), "cushion");
    expect(extra()).toHaveValue("cushion");

    await user.selectOptions(item(), "lamp");
    expect(extra()).toHaveValue("");
    expect(within(extra()).queryByRole("option", { name: /Cushion/ })).not.toBeInTheDocument();
  });
});

describe("DeskForm — validation (shared validatePayment)", () => {
  it("shows the exact messages, marks fields invalid, and calls no API", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={ITEMS} />);
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Choose an item")).toBeInTheDocument();
    expect(screen.getByText("Enter a charge id like ch_12345678")).toBeInTheDocument();
    for (const [field, message] of [
      [email(), "Enter a valid email"],
      [item(), "Choose an item"],
      [chargeId(), "Enter a charge id like ch_12345678"],
    ] as const) {
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(message);
    }
    expect(email()).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates Preview too, without calling the API", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={ITEMS} />);
    await user.type(email(), "nope");
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("DeskForm — Preview", () => {
  it("posts the form and shows email, item, extra 'None', total, and remaining after", async () => {
    const user = userEvent.setup();
    reply(LAMP_PREVIEW);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));

    const region = previewRegion();
    await within(region).findByText("ada@example.com");
    expect(within(region).getByText("Maple lamp")).toBeInTheDocument();
    expect(within(region).getByText("None")).toBeInTheDocument();
    expect(within(region).getByText("$80")).toBeInTheDocument();
    expect(within(region).getByText("4 left")).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/payments/preview");
    // type="email" inputs drop surrounding spaces themselves; the server lowercases.
    expect(JSON.parse(init.body)).toStrictEqual({
      email: "Ada@Example.com",
      sku: "lamp",
      externalChargeId: "ch_12345678",
      extraCode: null,
    });
  });

  it("shows the Cushion and $145 for a stool", async () => {
    const user = userEvent.setup();
    reply({
      ok: true,
      preview: { ...LAMP_PREVIEW.preview, sku: "stool", itemName: "Cedar stool", extraCode: "cushion", extraName: "Cushion", totalCents: 14500, remainingAfter: 1 },
    });
    render(<DeskForm items={ITEMS} />);
    await user.type(email(), "ada@example.com");
    await user.selectOptions(item(), "stool");
    await user.selectOptions(extra(), "cushion");
    await user.type(chargeId(), "ch_12345678");
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(await within(previewRegion()).findByText("$145")).toBeInTheDocument();
    expect(within(previewRegion()).getByText("Cushion")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).extraCode).toBe("cushion");
  });

  it("clears the preview as soon as any field changes", async () => {
    const user = userEvent.setup();
    reply(LAMP_PREVIEW);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await within(previewRegion()).findByText("$80");

    await user.type(chargeId(), "9");
    expect(within(previewRegion()).queryByText("$80")).not.toBeInTheDocument();
  });

  it("ignores a preview that arrives after the form was edited", async () => {
    const user = userEvent.setup();
    let resolveReply: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolveReply = resolve)));
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await user.type(email(), "x");
    resolveReply(new Response(JSON.stringify(LAMP_PREVIEW)));
    await waitFor(() => expect(screen.getByRole("button", { name: "Preview" })).toBeEnabled());
    expect(within(previewRegion()).queryByText("$80")).not.toBeInTheDocument();
  });

  it("shows the server's 409 Sold out on the Item field", async () => {
    const user = userEvent.setup();
    reply({ ok: false, errors: { sku: "Sold out" } }, 409);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Sold out")).toBeInTheDocument();
    expect(item()).toHaveAccessibleDescription("Sold out");
  });
});

describe("DeskForm — Record payment", () => {
  it("records, announces it, clears the form, and refreshes the server data", async () => {
    const user = userEvent.setup();
    reply({ replayed: false, payment: LAMP_PAYMENT }, 201);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    await waitFor(() => expect(status()).toHaveTextContent("Payment recorded: Maple lamp, $80, ch_12345678."));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/payments");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(email()).toHaveValue("");
    expect(item()).toHaveValue("");
    expect(chargeId()).toHaveValue("");
  });

  it("can be submitted from the keyboard with Enter", async () => {
    const user = userEvent.setup();
    reply({ replayed: false, payment: LAMP_PAYMENT }, 201);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.type(chargeId(), "{Enter}");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/payments");
  });

  it("explains a replay: the original payment, nothing charged again", async () => {
    const user = userEvent.setup();
    reply({ replayed: true, payment: LAMP_PAYMENT }, 200);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        "Charge ch_12345678 was already recorded (Maple lamp, $80). Nothing was charged again.",
      ),
    );
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("puts server field errors on their fields and does not refresh", async () => {
    const user = userEvent.setup();
    reply({ ok: false, errors: { extraCode: "That extra is not sold with this item" } }, 400);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText("That extra is not sold with this item")).toBeInTheDocument();
    expect(extra()).toHaveAttribute("aria-invalid", "true");
    expect(router.refresh).not.toHaveBeenCalled();
    expect(email()).toHaveValue("Ada@Example.com");
  });

  it("shows Sold out on the Item field for a 409", async () => {
    const user = userEvent.setup();
    reply({ ok: false, errors: { sku: "Sold out" } }, 409);
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText("Sold out")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("reports a network failure and keeps what was typed", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(status()).toHaveTextContent("Could not reach the server. Nothing was recorded. Try again."),
    );
    expect(chargeId()).toHaveValue("ch_12345678");
  });

  it("disables both buttons while a request is in flight, so a double click sends once", async () => {
    const user = userEvent.setup();
    let resolveReply: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (resolveReply = resolve)));
    render(<DeskForm items={ITEMS} />);
    await fillLamp(user);
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Record payment" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    resolveReply(new Response(JSON.stringify({ replayed: false, payment: LAMP_PAYMENT }), { status: 201 }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Record payment" })).toBeEnabled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
