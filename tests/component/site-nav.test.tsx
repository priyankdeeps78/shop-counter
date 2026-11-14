import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteNav } from "@/components/site-nav";

const navigation = vi.hoisted(() => ({ pathname: "/shop" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

describe("SiteNav", () => {
  beforeEach(() => {
    navigation.pathname = "/shop";
  });

  it("renders a labelled navigation with the three sections", () => {
    render(<SiteNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Desk" })).toHaveAttribute("href", "/desk");
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });

  it("marks the current section with aria-current, including nested pages", () => {
    navigation.pathname = "/shop/stool";
    render(<SiteNav />);
    expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Desk" })).not.toHaveAttribute("aria-current");
  });
});
