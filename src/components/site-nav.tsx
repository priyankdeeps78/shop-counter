"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, isActivePath } from "@/lib/nav";

// Client Component only because the active link depends on the current path.
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="main-nav">
        {NAV_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
