import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format-money";

describe("formatMoney", () => {
  it.each([
    [8000, "$80"],
    [12000, "$120"],
    [1500, "$15"],
    [400, "$4"],
    [2200, "$22"],
    [2500, "$25"],
    [14500, "$145"],
    [1900, "$19"],
    [0, "$0"],
    [100000, "$1,000"],
  ])("formats %i cents as %s", (cents, expected) => {
    expect(formatMoney(cents)).toBe(expected);
  });
});
