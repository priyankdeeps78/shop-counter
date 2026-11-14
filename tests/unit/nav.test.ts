import { describe, expect, it } from "vitest";
import { isActivePath } from "@/lib/nav";

describe("isActivePath", () => {
  it("matches the section path and nested paths", () => {
    expect(isActivePath("/shop", "/shop")).toBe(true);
    expect(isActivePath("/shop/lamp", "/shop")).toBe(true);
  });

  it("does not match other sections or shared prefixes", () => {
    expect(isActivePath("/desk", "/shop")).toBe(false);
    expect(isActivePath("/shopping", "/shop")).toBe(false);
  });
});
