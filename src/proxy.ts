// Proxy ở root (Next.js 16 convention, trước đây gọi là middleware).
// Phase 25 URL strategy: paraglide strategy = ['url', 'globalVariable', 'cookie', 'baseLocale'].
//
// App structure: app/[locale]/*. URL browser /en/dashboard map trực tiếp tới
// app/[locale]/(protected)/dashboard/page.tsx. Locale segment là URL prefix;
// baseLocale vi không cần prefix (route /login map tới /[locale=vi]/login).
//
// Luồng xử lý:
// 1. Detect locale từ URL pathname (TRƯỚC paraglide — URL còn nguyên).
// 2. Inject header `x-paraglide-locale` vào NextRequest qua
//    NextResponse.next({ request: { headers } }) để root layout.tsx đọc
//    trong `headers()` và resolve đúng <html lang>. Cookie set trên request
//    mất tác dụng vì paraglide cloneRequestWithFallback tạo plain Request.
// 3. Set PARAGLIDE_LOCALE cookie trên response (browser giữ qua request sau).
// 4. Chạy paraglideMiddleware bên trong để paraglide set AsyncLocalStorage +
//    de-localize URL (NextRequest nuôi cookies extension, không mất khi chạm
//    vào). updateSession chạy TRƯỚC paraglide trên original NextRequest.
// 5. Locale trong AsyncLocalStorage = locale trong URL (đã verify m.*() trả
//    về "Sign in" trên /en/login và "Đăng nhập" trên /vi/login — xem patch
//    trong scripts/patch-paraglide-runtime.mjs để bypass Turbopack fragment).
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { paraglideMiddleware } from '@/paraglide/server';
import { baseLocale, locales, type Locale } from '@/paraglide/runtime';

export async function proxy(request: NextRequest) {
  // Detect locale từ URL prefix. Paraglide URL strategy cũng detect, nhưng ta
  // cần locale TRƯỚC khi build response headers/cookies.
  const url = new URL(request.url);
  const segment = url.pathname.split('/').filter(Boolean)[0];
  const localeFromUrl: Locale | undefined = (locales as readonly string[]).includes(
    segment ?? '',
  )
    ? (segment as Locale)
    : undefined;
  const localeValue: Locale = localeFromUrl ?? (baseLocale as Locale);

  // Inject header x-paraglide-locale để root layout.tsx đọc trong cùng
  // request — URL vẫn có prefix /en/ ở đây.
  const fwdHeaders = new Headers(request.headers);
  fwdHeaders.set('x-paraglide-locale', localeValue);

  return paraglideMiddleware(request, async () => {
    // Supabase auth refresh trên ORIGINAL NextRequest (giữ .cookies extension).
    // Chạy SAU paraglide để AsyncLocalStorage còn active cho updateSession nếu
    // sau này cần đọc locale. Hiện updateSession không cần locale.
    const supabaseResponse = await updateSession(request);

    // Build NextResponse với custom request headers (forward upstream) + keep
    // supabase response cookies (auth refresh).
    const response = NextResponse.next({
      request: { headers: fwdHeaders },
    });

    // Forward supabase auth cookies (sb-*-auth-token, etc.) sang response.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }

    // Set PARAGLIDE_LOCALE cookie cho browser (request sau không cần parse URL).
    response.cookies.set('PARAGLIDE_LOCALE', localeValue, {
      path: '/',
      maxAge: 60 * 60 * 24 * 400, // ~13 months
      sameSite: 'lax',
    });

    // Phase 04 (PDPD): nếu user đã soft-delete (deleted_at != null),
    // redirect tới /account-deleted. Ngoại trừ trang đó + /login + /privacy + /terms.
    const pathname = url.pathname;
    const isAllowedPath =
      pathname.endsWith('/account-deleted') ||
      pathname.endsWith('/login') ||
      pathname.endsWith('/privacy') ||
      pathname.endsWith('/terms') ||
      pathname === '/';

    if (!isAllowedPath) {
      // Forward request headers vào supabase client (updateSession đã tạo user)
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('deleted_at')
          .eq('id', user.id)
          .single();
        if (profile?.deleted_at) {
          return NextResponse.redirect(
            new URL(`/${localeValue}/account-deleted`, request.url),
          );
        }
      }
    }

    return response;
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - ảnh có extension (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};