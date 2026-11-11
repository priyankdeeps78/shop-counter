import { describe, expect, it } from "vitest";
import { validatePayment } from "@/lib/payments/validate-payment";

const valid = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };

describe("validatePayment", () => {
  it("normalises a valid payment", () => {
    expect(validatePayment({ ...valid, email: "  Ada@Example.COM " })).toEqual({
      ok: true,
      value: { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678", extraCode: null },
    });
  });

  it.each(["", "ada", "@example.com", "ada@", "a@b@c", "  @  "])("rejects email %j", (email) => {
    expect(validatePayment({ ...valid, email })).toEqual({
      ok: false,
      errors: { email: "Enter a valid email" },
    });
  });

  it.each([undefined, "", "notebook", "LAMP"])("rejects item %j", (sku) => {
    expect(validatePayment({ ...valid, sku })).toEqual({ ok: false, errors: { sku: "Choose an item" } });
  });

  it.each(["", "ch_1234567", "ch_1234567!", "CH_12345678", "12345678"])("rejects charge id %j", (id) => {
    expect(validatePayment({ ...valid, externalChargeId: id })).toEqual({
      ok: false,
      errors: { externalChargeId: "Enter a charge id like ch_12345678" },
    });
  });

  it("accepts omitted, null and empty extra as no extra", () => {
    for (const extraCode of [undefined, null, ""]) {
      const result = validatePayment({ ...valid, extraCode });
      expect(result.ok && result.value.extraCode).toBeNull();
    }
  });

  it("accepts Cushion only with Cedar stool", () => {
    expect(validatePayment({ ...valid, sku: "stool", extraCode: "cushion" }).ok).toBe(true);
    expect(validatePayment({ ...valid, sku: "lamp", extraCode: "cushion" })).toEqual({
      ok: false,
      errors: { extraCode: "That extra is not sold with this item" },
    });
  });

  it("rejects an unknown extra", () => {
    expect(validatePayment({ ...valid, sku: "stool", extraCode: "blanket" })).toEqual({
      ok: false,
      errors: { extraCode: "That extra is not sold with this item" },
    });
  });

  it("reports every failing field for a non-object body", () => {
    const result = validatePayment("nope");
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["email", "externalChargeId", "sku"]);
  });
});
