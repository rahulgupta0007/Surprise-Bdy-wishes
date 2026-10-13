import { cn } from "cn";

export function Candle({ blown, className }: { blown?: boolean; className?: string }) {
  return (
    <span className={cn("candle", blown && "candle-blown", className)} aria-hidden>
      <span className="candle-glow" />
      <svg viewBox="0 0 160 280" className="candle-svg">
        <ellipse cx="80" cy="252" rx="46" ry="10" fill="#f3c3d2" opacity="0.7" />
        <path d="M58 96h44c6 40 8 92 6 148H52c-2-56 0-108 6-148z" fill="#fff7f4" />
        <path d="M62 108h14c2 36 2 84 1 128H60c0-44-1-92 2-128z" fill="#ffe4ea" opacity="0.9" />
        <path d="M54 92c8 8 44 8 52 0 2 10-6 16-26 16S52 102 54 92z" fill="#fff" />
        <rect x="77" y="78" width="6" height="22" rx="2" fill="#6b3a42" />
        <g className="flame">
          <ellipse cx="80" cy="58" rx="16" ry="28" fill="#ffb703" />
          <ellipse cx="80" cy="62" rx="9" ry="18" fill="#fff1c9" />
          <ellipse cx="80" cy="68" rx="4" ry="8" fill="#fff" />
        </g>
      </svg>
    </span>
  );
}
