const PETALS = [
  { left: "6%", delay: "0s", duration: "16s", size: 18, drift: 30 },
  { left: "16%", delay: "3s", duration: "19s", size: 14, drift: -24 },
  { left: "28%", delay: "7s", duration: "15s", size: 22, drift: 18 },
  { left: "42%", delay: "1s", duration: "21s", size: 12, drift: -16 },
  { left: "55%", delay: "5s", duration: "17s", size: 20, drift: 26 },
  { left: "68%", delay: "9s", duration: "18s", size: 15, drift: -20 },
  { left: "78%", delay: "2s", duration: "20s", size: 24, drift: 14 },
  { left: "90%", delay: "6s", duration: "16s", size: 13, drift: -28 },
  { left: "34%", delay: "11s", duration: "22s", size: 16, drift: 22 },
  { left: "84%", delay: "13s", duration: "18s", size: 18, drift: -12 },
];

export function Petals() {
  return (
    <div className="petals" aria-hidden>
      {PETALS.map((petal, index) => (
        <span
          key={index}
          className="petal"
          style={{
            left: petal.left,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
            width: petal.size,
            height: petal.size * 0.72,
            ["--drift" as string]: `${petal.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export function Flower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="#f4a7c0">
        <ellipse cx="32" cy="14" rx="8" ry="12" />
        <ellipse cx="32" cy="50" rx="8" ry="12" />
        <ellipse cx="14" cy="32" rx="12" ry="8" />
        <ellipse cx="50" cy="32" rx="12" ry="8" />
      </g>
      <circle cx="32" cy="32" r="7" fill="#fff6c8" />
    </svg>
  );
}
