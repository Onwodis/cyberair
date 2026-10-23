import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

/**
 * Edge proxy: issues a per-request nonce-based Content-Security-Policy (so the
 * app earns a clean grade on its own scanner) and enforces the admin session.
 *
 * `script-src 'self' 'nonce-…' 'strict-dynamic'` means only scripts carrying
 * this request's nonce (and those they load) execute — inline injection is
 * dead. Next.js stamps the nonce onto its framework/bundle scripts
 * automatically; next-themes receives it via its `nonce` prop. `unsafe-eval`
 * is dev-only (React debugging) and never present in production.
 */
export async function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
    isDev ? " 'unsafe-eval'" : ''
  };
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  // Admin portal gate (page routes; API routes self-verify the JWT).
  const path = req.nextUrl.pathname;
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = req.cookies.get('sec_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'permissions-policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
