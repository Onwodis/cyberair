'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import ParticleField from './ParticleField';

/**
 * Fixed, non-interactive cyber ambience: a cursor-reactive particle
 * constellation, a 3D perspective grid, drifting glow orbs and a scanline
 * overlay. Recolours with the theme.
 */
export default function CyberBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme !== 'light';

  // Cool palette in dark mode, warm palette in light mode.
  const orb1 = isDark ? 'rgba(34,211,238,0.18)' : 'rgba(234,160,72,0.28)';
  const orb2 = isDark ? 'rgba(168,85,247,0.16)' : 'rgba(244,114,92,0.24)';
  const orb3 = isDark ? 'rgba(52,211,153,0.12)' : 'rgba(217,160,102,0.22)';

  return (
    <>
      <ParticleField isDark={isDark} />
      <div className="cyber-grid" aria-hidden />
      <div
        className="cyber-orb"
        aria-hidden
        style={{
          width: 420,
          height: 420,
          top: '-80px',
          left: '-80px',
          background: orb1,
        }}
      />
      <div
        className="cyber-orb"
        aria-hidden
        style={{
          width: 360,
          height: 360,
          bottom: '-60px',
          right: '-40px',
          background: orb2,
          animationDelay: '3s',
        }}
      />
      <div
        className="cyber-orb"
        aria-hidden
        style={{
          width: 300,
          height: 300,
          top: '40%',
          right: '20%',
          background: orb3,
          animationDelay: '6s',
        }}
      />
    </>
  );
}
