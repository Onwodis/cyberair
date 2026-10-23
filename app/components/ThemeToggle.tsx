'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/** Fixed light/dark switch backed by next-themes. */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== 'light';
  // Until mounted, server and client must agree — use a neutral, static label.
  const label = !mounted
    ? 'Toggle theme'
    : `Switch to ${isDark ? 'light' : 'dark'} mode`;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-700 bg-slate-900/80 text-cyan-300 backdrop-blur-md shadow-xl hover:border-cyan-500 transition-all cursor-pointer"
    >
      {!mounted ? (
        <span className="w-4 h-4" />
      ) : isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="text-[11px] font-bold tracking-wider">
        {!mounted ? '' : isDark ? 'LIGHT' : 'DARK'}
      </span>
    </button>
  );
}
