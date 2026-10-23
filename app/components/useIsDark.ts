'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Hydration-safe theme flag. Returns true (dark) until mounted so SSR and the
 * first client render agree, then reflects the resolved next-themes value.
 */
export function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return !mounted || resolvedTheme !== 'light';
}
