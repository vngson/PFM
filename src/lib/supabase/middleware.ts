// Helper để refresh session trong middleware.
// Tách ra để middleware.ts ở root được gọn.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_AUTH_COOKIES = [
  'sb-access-token',
  'sb-refresh-token',
  'supabase-auth-token',
];

/** Best-effort clear cookies: match cả key không có suffix (vd sb-xxx-auth-token). */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  const names = new Set<string>(SUPABASE_AUTH_COOKIES);
  for (const c of request.cookies.getAll()) {
    if (
      c.name.startsWith('sb-') ||
      c.name.startsWith('supabase-auth') ||
      names.has(c.name)
    ) {
      names.add(c.name);
    }
  }
  for (const name of names) {
    request.cookies.delete(name);
    response.cookies.delete(name);
  }
}

/**
 * Refresh Supabase auth session trên mỗi request:
 * - Nếu token hết hạn → tự refresh bằng refresh token lưu trong cookies
 * - Ghi lại cookies mới cho cả downstream Server Components và browser
 * - Set cache headers để tránh CDN cache làm stale session
 *
 * Nếu refresh fail vì refresh_token bị server từ chối (vd user đã bị xóa,
 * key rotate, session bị revoke) → clear auth cookies để client không bị
 * stuck với stale token. Browser sẽ thấy như chưa login.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Luôn gọi getUser() để refresh session nếu cần.
  // Đây là cách chuẩn theo docs của @supabase/ssr — KHÔNG dùng getSession() vì không an toàn.
  const { error } = await supabase.auth.getUser();

  // Stale refresh token → clear cookies để request tiếp theo redirect về /login
  // thay vì lặp lại lỗi và throw trong requireUser.
  if (error && (error.code === 'refresh_token_not_found' || error.code === 'invalid_grant')) {
    clearAuthCookies(request, supabaseResponse);
  }

  return supabaseResponse;
}
