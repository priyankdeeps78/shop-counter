import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {children && <p className="mt-3 text-lg text-muted">{children}</p>}
    </div>
  );
}
