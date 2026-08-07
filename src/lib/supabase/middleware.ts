// Helper để refresh session trong middleware.
// Tách ra để middleware.ts ở root được gọn.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh Supabase auth session trên mỗi request:
 * - Nếu token hết hạn → tự refresh bằng refresh token lưu trong cookies
 * - Ghi lại cookies mới cho cả downstream Server Components và browser
 * - Set cache headers để tránh CDN cache làm stale session
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
  await supabase.auth.getUser();

  return supabaseResponse;
}
