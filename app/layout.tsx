import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "./nav-links";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "opsz"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { template: "%s | Shop counter", default: "Shop counter" },
  description: "A small shop: catalogue, staff payment desk and checkout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-10 border-b border-line/80 bg-paper/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <Logo />
              <span className="font-display text-xl font-semibold tracking-tight">Shop counter</span>
            </Link>
            <nav aria-label="Main">
              <Suspense fallback={null}>
                <NavLinks />
              </Suspense>
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 focus:outline-none">
          {children}
        </main>
        <footer className="border-t border-line/80">
          <p className="mx-auto max-w-5xl px-5 py-6 text-sm text-muted">
            Demo shop. Stock, payments and orders live in server memory and reset on restart.
          </p>
        </footer>
      </body>
    </html>
  );
}

function Logo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-8 w-8 transition group-hover:-rotate-6"
    >
      <rect width="32" height="32" rx="9" fill="var(--color-moss)" />
      {/* An awning over a counter. */}
      <path d="M7 12.5 9 8h14l2 4.5" fill="none" stroke="#fffcf6" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M7 12.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"
        fill="none"
        stroke="#fffcf6"
        strokeWidth="2"
      />
      <path d="M9 16v8h14v-8" fill="none" stroke="#fffcf6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
