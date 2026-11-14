"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { NAV_LINKS, isActivePath } from "@/lib/nav";

export function SiteNav() {
  const pathname = usePathname();
  const navId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <div
      className="site-navigation"
      data-open={open}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpenPath(null);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== "Escape") return;
        setOpenPath(null);
        toggle.current?.focus();
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-controls={navId}
        aria-expanded={open}
        onClick={() => setOpenPath(open ? null : pathname)}
      >
        <span className="menu-toggle-icon" aria-hidden="true" />
      </button>
      <nav id={navId} aria-label="Main" className="site-nav">
        <ul className="main-nav">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
                className="nav-link"
                onNavigate={() => setOpenPath(null)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
