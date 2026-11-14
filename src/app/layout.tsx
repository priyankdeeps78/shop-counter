import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Shop counter", template: "%s | Shop counter" },
  description:
    "A small shop: browse the catalogue, record staff payments, and check out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="site-shell">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        <header className="site-header">
          <div className="site-container header-inner">
            <Link href="/shop" className="wordmark">
              <span className="wordmark-icon" aria-hidden="true" />
              Shop counter
            </Link>
            <SiteNav />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="site-container site-main">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
