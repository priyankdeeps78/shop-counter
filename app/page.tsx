import Link from "next/link";
import { ItemArt } from "@/components/item-art";

const sections = [
  {
    href: "/shop",
    title: "Shop",
    body: "Browse the catalogue, with live stock for the limited pieces.",
    sku: "lamp",
  },
  {
    href: "/desk",
    title: "Staff desk",
    body: "Preview and record a payment taken for a lamp or a stool.",
    sku: "stool",
  },
  {
    href: "/checkout",
    title: "Checkout",
    body: "Fill a basket with stationery and pay the price you were shown.",
    sku: "notebook",
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="grid items-center gap-10 py-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">Maple, cedar and good paper</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            A small shop with a proper counter.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Five things, made well. Lamps and stools come in short runs; the stationery never runs out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Browse the shop
            </Link>
            <Link href="/checkout" className="btn-secondary">
              Go to checkout
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="grid grid-cols-2 gap-4">
          <ItemArt sku="lamp" className="card aspect-square rotate-[-3deg]" />
          <ItemArt sku="stool" className="card mt-10 aspect-square rotate-[2deg]" />
          <ItemArt sku="pen" className="card -mt-6 aspect-square rotate-[2deg]" />
          <ItemArt sku="case" className="card mt-4 aspect-square rotate-[-2deg]" />
        </div>
      </section>

      <h2 className="sr-only">Sections</h2>
      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {sections.map((s) => (
          <li
            key={s.href}
            className="card group relative flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-moss"
          >
            <ItemArt sku={s.sku} className="h-14 w-14 shrink-0 rounded-xl" />
            <div>
              <Link
                href={s.href}
                className="font-display text-xl font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
              >
                {s.title}
              </Link>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
