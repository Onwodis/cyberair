'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Full-screen boot overlay: the cyberAir logo pulsates while the app mounts,
 * then the whole thing fades away to reveal the UI at once (no partial paint).
 * Rendered opaque on the server too, so it covers content from first paint.
 */
export default function Preloader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDone(true), 1700); // start fade
    const t2 = setTimeout(() => setGone(true), 2350); // unmount
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 transition-opacity duration-[600ms] ${
        done ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center gap-5">
        {/* expanding halo rings */}
        <span className="absolute -inset-10 rounded-full border border-cyan-500/20 preload-ring" />
        <span className="absolute -inset-16 rounded-full border border-emerald-500/10 preload-ring preload-ring-2" />

        <div className="preload-logo relative flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-950/50 border border-cyan-500/40">
          <ShieldCheck className="w-10 h-10 text-cyan-400" />
        </div>

        <div className="text-center">
          <div className="preload-text text-2xl font-extrabold tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            cyberAir
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-slate-500">
            Initializing Security Engine
          </div>
        </div>
      </div>

      <style>{`
        @keyframes preloadPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,211,238,0.5); }
          50% { transform: scale(1.12); box-shadow: 0 0 40px 8px rgba(34,211,238,0.35); }
        }
        @keyframes preloadGlow {
          0%, 100% { opacity: 0.55; filter: drop-shadow(0 0 4px rgba(34,211,238,0.4)); }
          50% { opacity: 1; filter: drop-shadow(0 0 16px rgba(34,211,238,0.8)); }
        }
        @keyframes preloadRing {
          0% { transform: scale(0.75); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .preload-logo { animation: preloadPulse 1.1s ease-in-out infinite; }
        .preload-text { animation: preloadGlow 1.4s ease-in-out infinite; }
        .preload-ring { animation: preloadRing 1.8s ease-out infinite; }
        .preload-ring-2 { animation-delay: 0.6s; }
        @media (prefers-reduced-motion: reduce) {
          .preload-logo, .preload-text, .preload-ring { animation: none; }
        }
      `}</style>
    </div>
  );
}
