'use client';

/**
 * Fixed, non-interactive cyber ambience: a 3D perspective grid, drifting glow
 * orbs and an animated scanline overlay. Pure CSS (see globals.css) so it costs
 * nothing on the main thread and respects prefers-reduced-motion.
 */
export default function CyberBackground() {
  return (
    <>
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
