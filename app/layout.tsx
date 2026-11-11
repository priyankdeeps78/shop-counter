import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | Shop counter", default: "Shop counter" },
  description: "A small shop: catalogue, staff payment desk and checkout.",
};

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/desk", label: "Staff desk" },
  { href: "/checkout", label: "Checkout" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:outline-2"
        >
          Skip to content
        </a>
        <header className="border-b border-stone-300 bg-stone-50">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold">
              Shop counter
            </Link>
            <nav aria-label="Main">
              <ul className="flex gap-4">
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="underline-offset-4 hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 focus:outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}
