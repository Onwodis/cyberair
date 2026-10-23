import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import ThemeToggle from './components/ThemeToggle';

const APP_NAME = 'cyberAir';
const APP_DEFAULT_TITLE =
  'cyberAir - Security Header Auditor & Risk Analysis';
const APP_TITLE_TEMPLATE = '%s | cyberAir';
const APP_DESCRIPTION =
  'Analyze web application headers instantly for vulnerabilities like CSP, HSTS, and X-Frame-Options with plain-English threat breakdowns and exploit scenarios.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cyberair.app';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  keywords: [
    'Security Header Auditor',
    'Content Security Policy Generator',
    'Clickjacking Defense',
    'OWASP Top 10 Headers',
    'HSTS Validator',
    'Cybersecurity Audit Tool',
    'Samuel Onwodi',
  ],
  authors: [{ name: 'Samuel Onwodi' }],
  creator: 'Samuel Onwodi',
  publisher: 'Meraki Group',
  metadataBase: new URL(APP_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    url: APP_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    creator: '@samuelonwodi',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: APP_NAME,
    url: APP_URL,
    description: APP_DESCRIPTION,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'All',
    author: { '@type': 'Person', name: 'Samuel Onwodi' },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  // Pre-paint theme resolution to avoid a flash of the wrong palette.
  const themeScript = `(function(){try{var t=localStorage.getItem('cyberair_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-mono antialiased min-h-screen selection:bg-cyan-500 selection:text-slate-950">
        {children}
        <ThemeToggle />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
