"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/desk", label: "Staff desk" },
  { href: "/checkout", label: "Checkout" },
] as const;

/** Marks the current section with aria-current, for screen readers and styling. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 text-sm font-medium">
      {nav.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className="rounded-full px-3.5 py-2 text-muted transition hover:bg-line/60 hover:text-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
