import type { ReactNode } from "react";

const INK = "#211c16";

type Art = { tint: string; fill: string; draw: ReactNode };

/** Outline for filled shapes (each sets its own fill). */
const stroke = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
/** Outline for open lines, which must not be filled. */
const line = { ...stroke, fill: "none" };

/** Line drawings for each sku. Decorative only: always aria-hidden. */
const ART: Record<string, Art> = {
  lamp: {
    tint: "#f4e4c4",
    fill: "#e9b44c",
    draw: (
      <>
        <ellipse cx="60" cy="66" rx="30" ry="8" fill="#fff4d6" opacity="0.8" />
        <path d="M42 28h36l14 32H28z" fill="var(--art-fill)" {...stroke} />
        <path d="M60 60v30" {...line} />
        <path d="M44 94h32" {...line} strokeWidth={6} />
      </>
    ),
  },
  stool: {
    tint: "#ecdcc6",
    fill: "#c98a55",
    draw: (
      <>
        <rect x="28" y="36" width="64" height="13" rx="6.5" fill="var(--art-fill)" {...stroke} />
        <path d="M38 49 31 96M82 49l7 47M60 49v47M35 76h50" {...line} />
      </>
    ),
  },
  notebook: {
    tint: "#dde8db",
    fill: "#6f9a7f",
    draw: (
      <>
        <rect x="35" y="22" width="52" height="76" rx="5" fill="var(--art-fill)" {...stroke} />
        <path d="M46 22v76" {...line} />
        <path d="M78 22v76" {...line} strokeWidth={5} />
        <rect x="52" y="40" width="20" height="9" rx="2" fill="#fffcf6" {...stroke} strokeWidth={2} />
      </>
    ),
  },
  pen: {
    tint: "#dfe5ef",
    fill: "#5b79a8",
    draw: (
      <g transform="rotate(-35 60 60)">
        <rect x="53" y="16" width="14" height="70" rx="5" fill="var(--art-fill)" {...stroke} />
        <path d="M53 86l7 16 7-16" fill="#fffcf6" {...stroke} />
        <path d="M60 22v28" {...line} strokeWidth={2.5} />
        <path d="M67 26h5v22" {...line} strokeWidth={2.5} />
      </g>
    ),
  },
  case: {
    tint: "#f0ddd5",
    fill: "#b5654a",
    draw: (
      <>
        <rect x="42" y="20" width="40" height="40" rx="3" fill="#6f9a7f" {...stroke} />
        <path d="M34 38h56v52a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6z" fill="var(--art-fill)" {...stroke} />
        <path d="M52 38a10 10 0 0 0 20 0" fill="#fffcf6" {...stroke} />
      </>
    ),
  },
};

const FALLBACK: Art = {
  tint: "#ece4d6",
  fill: "#c9bba4",
  draw: <rect x="34" y="34" width="52" height="52" rx="8" fill="var(--art-fill)" {...stroke} />,
};

export function ItemArt({ sku, className = "" }: { sku: string; className?: string }) {
  const art = ART[sku] ?? FALLBACK;
  return (
    <div
      aria-hidden="true"
      className={`grid place-items-center overflow-hidden ${className}`}
      style={{ backgroundColor: art.tint, ["--art-fill" as string]: art.fill }}
    >
      <svg viewBox="0 0 120 120" className="h-4/5 w-4/5">
        {art.draw}
      </svg>
    </div>
  );
}
