'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Fixed light/dark switch. Theme lives on <html data-theme> (set pre-paint by a
 * nonce'd inline script in the layout) and is persisted to localStorage.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute('data-theme') as
        | 'dark'
        | 'light') || 'dark';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('cyberair_theme', next);
    } catch {
      /* ignore storage errors (private mode) */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-700 bg-slate-900/80 text-cyan-300 backdrop-blur-md shadow-xl hover:border-cyan-500 transition-all"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="text-[11px] font-bold tracking-wider">
        {theme === 'dark' ? 'LIGHT' : 'DARK'}
      </span>
    </button>
  );
}
