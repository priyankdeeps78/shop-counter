import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Desk",
  description: "Record staff payments.",
};

export default function DeskPage() {
  return (
    <section aria-labelledby="page-heading" className="space-y-2">
      <h1 id="page-heading" className="text-2xl font-semibold">
        Desk
      </h1>
      <p className="text-muted">Coming soon.</p>
    </section>
  );
}
