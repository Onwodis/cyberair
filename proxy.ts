import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-change-this'
);

/**
 * Edge proxy: applies a hardened, statically-compatible Content-Security-Policy
 * and enforces the admin portal session.
 *
 * Note on `script-src 'unsafe-inline'`: Next.js statically prerenders these
 * pages and emits small inline hydration scripts at build time, so there is no
 * per-request nonce to bind them to. This is the honest, common trade-off for a
 * static Next app. The rest of the policy is strict — no `unsafe-eval` (prod),
 * `object-src 'none'`, locked `base-uri`/`form-action`, framing denied, and
 * insecure requests upgraded.
 */
export async function proxy(req: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
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

  const response = NextResponse.next();
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
