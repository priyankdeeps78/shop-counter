import { describe, expect, it } from "vitest";
import { NAV_LINKS, isActivePath } from "@/lib/nav";

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

describe("NAV_LINKS", () => {
  it("links to the three areas of the app", () => {
    expect(NAV_LINKS.map((link) => link.href)).toEqual(["/shop", "/desk", "/checkout"]);
  });
});
