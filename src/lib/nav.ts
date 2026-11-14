export type NavLink = { href: string; label: string };

export const NAV_LINKS: readonly NavLink[] = [
  { href: "/shop", label: "Shop" },
  { href: "/desk", label: "Desk" },
  { href: "/checkout", label: "Checkout" },
];

/** A section link is active on its own path and on any nested path (e.g. /shop/lamp). */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
