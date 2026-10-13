import { useId } from "react";
import { cn } from "cn";

export function WaxSeal({ letter, className }: { letter: string; className?: string }) {
  const gradientId = `wax-${useId().replace(/:/g, "")}`;
  const mark = (letter.trim().charAt(0) || "·").toLocaleUpperCase();

  return (
    <span className={cn("seal-wrap relative inline-grid place-items-center", className)}>
      <svg viewBox="0 0 200 214" className="col-start-1 row-start-1 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id={gradientId} cx="36%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#d15a6c" />
            <stop offset="42%" stopColor="#8f2d3c" />
            <stop offset="100%" stopColor="#4a1522" />
          </radialGradient>
        </defs>
        <path d="M88 166c5 18 8 28 12 40 4-12 7-22 12-40" fill="#641f2e" />
        <ellipse cx="100" cy="206" rx="14" ry="5.5" fill="#4c1722" opacity="0.85" />
        <circle cx="100" cy="96" r="90" fill={`url(#${gradientId})`} />
        <circle cx="100" cy="96" r="78" fill="none" stroke="#f0d7a4" strokeWidth="1.15" opacity="0.85" />
        <circle
          cx="100"
          cy="96"
          r="68"
          fill="none"
          stroke="#f0d7a4"
          strokeWidth="2.2"
          strokeDasharray="1.2 6.8"
          opacity="0.72"
        />
        <ellipse cx="72" cy="60" rx="32" ry="16" fill="white" opacity="0.16" transform="rotate(-28 72 60)" />
      </svg>
      <span className="seal-mark pointer-events-none col-start-1 row-start-1 font-display italic leading-none text-[#f6e7c4]">
        {mark}
      </span>
    </span>
  );
}
