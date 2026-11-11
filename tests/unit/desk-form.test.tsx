import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeskForm, type DeskItem } from "@/app/desk/desk-form";
import { findItem } from "@/lib/store";
import { routeFetch } from "./route-fetch";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const items: DeskItem[] = [
  { sku: "lamp", name: "Maple lamp", priceCents: 8000, extras: [] },
  {
    sku: "stool",
    name: "Cedar stool",
    priceCents: 12000,
    extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
  },
];

beforeEach(() => {
  refresh.mockReset();
  vi.stubGlobal("fetch", vi.fn(routeFetch));
});

async function fill(user: ReturnType<typeof userEvent.setup>, sku: string, extra = "") {
  await user.type(screen.getByLabelText("Email"), " Ada@Example.com ");
  await user.selectOptions(screen.getByLabelText("Item"), sku);
  if (extra) await user.selectOptions(screen.getByLabelText("Extra"), extra);
  await user.type(screen.getByLabelText("Charge id"), "ch_12345678");
}

describe("DeskForm", () => {
  it("previews a payment without changing stock", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={items} />);
    await fill(user, "stool", "cushion");

    await user.click(screen.getByRole("button", { name: "Preview" }));

    const preview = screen.getByRole("region", { name: "Payment preview" });
    await within(preview).findByText("ada@example.com");
    expect(preview).toHaveTextContent("Cedar stool");
    expect(preview).toHaveTextContent("Cushion");
    expect(preview).toHaveTextContent("$145");
    expect(preview).toHaveTextContent("Remaining after1");
    expect(findItem("stool")?.remaining).toBe(2);
  });

  it("clears a selected Cushion when Maple lamp is chosen", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={items} />);

    await user.selectOptions(screen.getByLabelText("Item"), "stool");
    await user.selectOptions(screen.getByLabelText("Extra"), "cushion");
    expect(screen.getByLabelText("Extra")).toHaveValue("cushion");

    await user.selectOptions(screen.getByLabelText("Item"), "lamp");
    expect(screen.getByLabelText("Extra")).toHaveValue("");
    expect(screen.getByRole("option", { name: /Cushion/ })).toBeDisabled();
  });

  it("shows validatePayment's messages next to the fields and sends nothing", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={items} />);

    await user.type(screen.getByLabelText("Email"), "nope");
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Choose an item")).toBeInTheDocument();
    expect(screen.getByText("Enter a charge id like ch_12345678")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("records a payment, then reports a replay of the same charge id", async () => {
    const user = userEvent.setup();
    render(<DeskForm items={items} />);

    await fill(user, "lamp");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText(/Payment recorded: Maple lamp for ada@example.com, \$80/)).toBeInTheDocument();
    expect(findItem("lamp")?.remaining).toBe(4);
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveValue("");

    await fill(user, "lamp");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText(/was already recorded/)).toBeInTheDocument();
    expect(findItem("lamp")?.remaining).toBe(4);
  });
});
