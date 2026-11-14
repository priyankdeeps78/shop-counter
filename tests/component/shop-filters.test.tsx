import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS, ShopFilters } from "@/features/catalog/components/shop-filters";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/shop",
}));

const searchBox = () => screen.getByRole("searchbox", { name: "Search" });
const sortSelect = () => screen.getByRole("combobox", { name: "Sort" });

// `delay: null`: user-event types without its own pauses between keys.
function setup() {
  return userEvent.setup({ delay: null });
}

beforeEach(() => {
  // Fake timers drive the debounce. `shouldAdvanceTime` lets RTL's internal
  // zero-delay timers fire; it only auto-detects Jest's fake timers, not Vitest's.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  router.push.mockClear();
  router.replace.mockClear();
  window.history.replaceState(null, "", "/shop");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ShopFilters", () => {
  it("labels the Search field and Sort select, inside a search landmark", () => {
    render(<ShopFilters q="" sort="name" />);
    expect(screen.getByRole("search", { name: "Catalogue" })).toBeInTheDocument();
    expect(searchBox()).toHaveValue("");
    expect(sortSelect()).toHaveValue("name");
    expect(screen.getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "name",
      "price-asc",
      "price-desc",
    ]);
  });

  it("shows the URL's values after a reload or direct link", () => {
    render(<ShopFilters q="sto" sort="price-desc" />);
    expect(searchBox()).toHaveValue("sto");
    expect(sortSelect()).toHaveValue("price-desc");
  });

  it("pushes one history entry for a new search, then replaces it while typing", async () => {
    const user = setup();
    render(<ShopFilters q="" sort="name" />);

    await user.type(searchBox(), "la");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop?q=la", { scroll: false });

    await user.type(searchBox(), "mp");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/shop?q=lamp", { scroll: false });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("waits for a pause in typing before navigating", async () => {
    const user = setup();
    render(<ShopFilters q="" sort="name" />);
    await user.type(searchBox(), "lamp");
    expect(router.push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop?q=lamp", { scroll: false });
  });

  it("navigates at once on Enter, keeping the current sort", async () => {
    window.history.replaceState(null, "", "/shop?sort=price-asc");
    const user = setup();
    render(<ShopFilters q="" sort="price-asc" />);
    await user.type(searchBox(), "pen{Enter}");
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop?sort=price-asc&q=pen", { scroll: false });
  });

  it("removes q from the URL when the search is cleared", async () => {
    window.history.replaceState(null, "", "/shop?q=lamp");
    const user = setup();
    render(<ShopFilters q="lamp" sort="name" />);
    await user.clear(searchBox());
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop", { scroll: false });
  });

  it("pushes a sort change and keeps q and other params", async () => {
    window.history.replaceState(null, "", "/shop?q=s&ref=home");
    const user = setup();
    render(<ShopFilters q="s" sort="name" />);
    await user.selectOptions(sortSelect(), "price-asc");
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop?q=s&ref=home&sort=price-asc", {
      scroll: false,
    });
  });

  it("follows Back/Forward: shows the URL's q and starts a new history entry on the next edit", async () => {
    const user = setup();
    const { rerender } = render(<ShopFilters q="" sort="name" />);
    await user.type(searchBox(), "lamp");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    rerender(<ShopFilters q="lamp" sort="name" />); // our navigation landed

    rerender(<ShopFilters q="" sort="price-desc" />); // Back to an older URL
    expect(searchBox()).toHaveValue("");
    expect(sortSelect()).toHaveValue("price-desc");

    router.push.mockClear();
    await user.type(searchBox(), "pen");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("keeps the user's newer text when an older navigation of its own lands late", async () => {
    const user = setup();
    const { rerender } = render(<ShopFilters q="" sort="name" />);
    await user.type(searchBox(), "la");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    await user.type(searchBox(), "mp");
    act(() => vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));

    rerender(<ShopFilters q="la" sort="name" />); // the first navigation arrives after the second was sent
    expect(searchBox()).toHaveValue("lamp");
    rerender(<ShopFilters q="lamp" sort="name" />);
    expect(searchBox()).toHaveValue("lamp");
  });

  it("applies text typed before hydration as soon as it hydrates", () => {
    const ui = <ShopFilters q="" sort="name" />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.append(container);
    // The user types into the server-rendered input before React attaches.
    container.querySelector<HTMLInputElement>("#shop-search")!.value = "lamp";

    render(ui, { container, hydrate: true });

    expect(searchBox()).toHaveValue("lamp");
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/shop?q=lamp", { scroll: false });
  });

  it("does not navigate when the search text has not changed", async () => {
    render(<ShopFilters q="lamp" sort="name" />);
    fireEvent.submit(searchBox().closest("form")!);
    fireEvent.blur(searchBox());
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
