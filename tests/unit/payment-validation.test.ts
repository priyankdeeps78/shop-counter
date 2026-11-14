import { describe, expect, it } from "vitest";
import {
  CHARGE_ID_PATTERN,
  PAYMENT_ERRORS,
  validatePayment,
} from "@/features/payments/lib/payment-validation";

// Literal strings from the brief, asserted directly so a changed constant fails here.
const EMAIL = "Enter a valid email";
const SKU = "Choose an item";
const CHARGE = "Enter a charge id like ch_12345678";
const EXTRA = "That extra is not sold with this item";

const valid = { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678" };
const errorsFor = (input: unknown) => {
  const result = validatePayment(input);
  return result.ok ? null : result.errors;
};

describe("validatePayment — success", () => {
  it("accepts a lamp with no extra and normalises extraCode to null", () => {
    expect(validatePayment(valid)).toStrictEqual({
      ok: true,
      value: { email: "ada@example.com", sku: "lamp", externalChargeId: "ch_12345678", extraCode: null },
    });
  });

  it("trims and lowercases the email", () => {
    const result = validatePayment({ ...valid, email: "  Ada@Example.COM \n" });
    expect(result.ok && result.value.email).toBe("ada@example.com");
  });

  it("accepts a stool with the Cushion", () => {
    expect(validatePayment({ ...valid, sku: "stool", extraCode: "cushion" })).toStrictEqual({
      ok: true,
      value: { email: "ada@example.com", sku: "stool", externalChargeId: "ch_12345678", extraCode: "cushion" },
    });
  });

  it("accepts an omitted, undefined, or null extra for either item", () => {
    for (const sku of ["lamp", "stool"]) {
      for (const extra of [{}, { extraCode: undefined }, { extraCode: null }]) {
        const result = validatePayment({ ...valid, sku, ...extra });
        expect(result).toMatchObject({ ok: true, value: { sku, extraCode: null } });
      }
    }
  });

  it("drops unknown keys from the normalised value", () => {
    const result = validatePayment({ ...valid, totalCents: 1, itemName: "Free lamp" });
    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      "email",
      "externalChargeId",
      "extraCode",
      "sku",
    ]);
  });

  it("does not change the input object", () => {
    const input = { ...valid, email: "  ADA@EXAMPLE.COM  " };
    validatePayment(input);
    expect(input.email).toBe("  ADA@EXAMPLE.COM  ");
  });
});

describe("validatePayment — email", () => {
  it.each(["a@b", "ADA@EXAMPLE.COM", "ada@localhost", "  a@b  ", "first last@example.com", "a+tag@b.co"])(
    "accepts %j (one @ with text on both sides; no stricter policy)",
    (email) => {
      expect(validatePayment({ ...valid, email }).ok).toBe(true);
    },
  );

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["only spaces", "   "],
    ["no @", "ada.example.com"],
    ["nothing before @", "@example.com"],
    ["nothing after @", "ada@"],
    ["only spaces before @", "   @example.com"],
    ["only spaces after @", "ada@   "],
    ["two @", "ada@example@com"],
    ["just @@", "@@"],
    ["a number", 42],
    ["null", null],
    ["an object", { value: "a@b" }],
  ])("rejects %s with exactly 'Enter a valid email'", (_label, email) => {
    expect(errorsFor({ ...valid, email })).toStrictEqual({ email: EMAIL });
  });
});

describe("validatePayment — item", () => {
  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["upper case", "LAMP"],
    ["padded", " lamp"],
    ["a checkout item", "notebook"],
    ["unknown", "chair"],
    ["the display name", "Maple lamp"],
    ["a number", 1],
    ["null", null],
  ])("rejects %s with exactly 'Choose an item'", (_label, sku) => {
    expect(errorsFor({ ...valid, sku })).toStrictEqual({ sku: SKU });
  });
});

describe("validatePayment — charge id", () => {
  it.each(["ch_12345678", "ch_ABCDEFGH", "ch_aB3dE6gH9", "ch_" + "x".repeat(64)])("accepts %s", (id) => {
    expect(validatePayment({ ...valid, externalChargeId: id }).ok).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["prefix only", "ch_"],
    ["7 characters after ch_", "ch_1234567"],
    ["upper-case prefix", "CH_12345678"],
    ["dash instead of underscore", "ch-12345678"],
    ["leading space (not trimmed)", " ch_12345678"],
    ["trailing newline", "ch_12345678\n"],
    ["punctuation", "ch_1234567!"],
    ["underscore in the body", "ch_1234_5678"],
    ["full-width digits", "ch_１２３４５６７８"],
    ["a number", 12345678],
    ["null", null],
  ])("rejects %s with exactly 'Enter a charge id like ch_12345678'", (_label, externalChargeId) => {
    expect(errorsFor({ ...valid, externalChargeId })).toStrictEqual({ externalChargeId: CHARGE });
  });

  it("uses the pattern from the brief", () => {
    expect(CHARGE_ID_PATTERN.source).toBe("^ch_[A-Za-z0-9]{8,}$");
  });
});

describe("validatePayment — extra", () => {
  it("rejects the Cushion on a Maple lamp", () => {
    expect(errorsFor({ ...valid, sku: "lamp", extraCode: "cushion" })).toStrictEqual({ extraCode: EXTRA });
  });

  it.each([
    ["empty string", ""],
    ["capitalised", "Cushion"],
    ["unknown extra", "pillow"],
    ["a number", 1],
    ["false", false],
    ["an array", ["cushion"]],
  ])("rejects %s as an extra, even on a stool", (_label, extraCode) => {
    expect(errorsFor({ ...valid, sku: "stool", extraCode })).toStrictEqual({ extraCode: EXTRA });
  });

  it("reports the Cushion with no valid item alongside the item error", () => {
    expect(errorsFor({ ...valid, sku: "chair", extraCode: "cushion" })).toStrictEqual({
      sku: SKU,
      extraCode: EXTRA,
    });
    expect(errorsFor({ ...valid, sku: undefined, extraCode: "cushion" })).toStrictEqual({
      sku: SKU,
      extraCode: EXTRA,
    });
  });

  it("reports lamp + Cushion together with other failing fields", () => {
    expect(errorsFor({ email: "nope", sku: "lamp", externalChargeId: "x", extraCode: "cushion" })).toStrictEqual({
      email: EMAIL,
      externalChargeId: CHARGE,
      extraCode: EXTRA,
    });
  });
});

describe("validatePayment — error shape", () => {
  it("lists only the fields that failed", () => {
    expect(errorsFor({ ...valid, email: "x" })).toStrictEqual({ email: EMAIL });
    expect(errorsFor({ ...valid, externalChargeId: "x" })).toStrictEqual({ externalChargeId: CHARGE });
  });

  it("reports all four fields when all four fail", () => {
    expect(errorsFor({ email: 1, sku: 2, externalChargeId: 3, extraCode: 4 })).toStrictEqual({
      email: EMAIL,
      sku: SKU,
      externalChargeId: CHARGE,
      extraCode: EXTRA,
    });
  });

  it("gives one message string per field", () => {
    const errors = errorsFor({ email: "", sku: "", externalChargeId: "" })!;
    for (const message of Object.values(errors)) expect(typeof message).toBe("string");
  });

  it("exports exactly the brief's messages", () => {
    expect(PAYMENT_ERRORS).toStrictEqual({
      email: EMAIL,
      sku: SKU,
      externalChargeId: CHARGE,
      extraCode: EXTRA,
    });
  });
});

describe("validatePayment — malformed input never throws", () => {
  const REQUIRED_MISSING = { email: EMAIL, sku: SKU, externalChargeId: CHARGE };

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["a string", '{"email":"a@b"}'],
    ["a number", 42],
    ["true", true],
    ["an array", [valid]],
    ["an empty object", {}],
    ["an object with no prototype", Object.create(null)],
  ])("treats %s as an empty form", (_label, input) => {
    expect(() => validatePayment(input)).not.toThrow();
    expect(errorsFor(input)).toStrictEqual(REQUIRED_MISSING);
  });
});
