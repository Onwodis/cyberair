'use client';

import { useEffect, useState } from 'react';

/**
 * Animated circular SVG gauge with an easing count-up and a slowly rotating
 * conic accent ring. Colour shifts by score band.
 */
export default function ScoreGauge({
  score,
  grade,
  label,
  size = 150,
}: {
  score: number;
  grade: string;
  label: string;
  size?: number;
}) {
  const [display, setDisplay] = useState(0);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const band =
    score >= 80
      ? { ring: '#34d399', glow: 'rgba(52,211,153,0.45)' }
      : score >= 50
      ? { ring: '#fbbf24', glow: 'rgba(251,191,36,0.45)' }
      : { ring: '#fb7185', glow: 'rgba(251,113,133,0.45)' };

  useEffect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * score));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circ - (display / 100) * circ;

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        className="ring-spin absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${band.glow}, transparent)`,
          filter: 'blur(6px)',
          opacity: 0.6,
        }}
        aria-hidden
      />
      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        role="img"
        aria-label={`${label}: ${score} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#1e293b"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={band.ring}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.1s linear',
            filter: `drop-shadow(0 0 6px ${band.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-extrabold"
          style={{ color: band.ring }}
        >
          {display}
        </span>
        <span className="text-[10px] tracking-widest text-slate-400">
          / 100
        </span>
        <span
          className="mt-1 text-xs font-bold px-2 py-0.5 rounded-md border"
          style={{ color: band.ring, borderColor: band.ring }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}
