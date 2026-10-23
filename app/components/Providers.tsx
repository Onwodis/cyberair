'use client';

import { ThemeProvider } from 'next-themes';

/**
 * App-wide theme state via next-themes. We drive the `data-theme` attribute on
 * <html> (so the palette overrides in globals.css apply) and disable system
 * preference so the explicit toggle is the single source of truth.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
