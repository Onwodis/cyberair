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
          background: 'rgba(34,211,238,0.18)',
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
          background: 'rgba(168,85,247,0.16)',
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
          background: 'rgba(52,211,153,0.12)',
          animationDelay: '6s',
        }}
      />
    </>
  );
}
