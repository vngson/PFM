// Route Handler xử lý email confirmation callback từ Supabase.
// Sau khi user click link trong email, Supabase redirect về đây
// kèm `?code=...`. Ta exchange code → session, rồi redirect về dashboard.
//
// Phase 25: route nằm trong /[locale]/auth/callback — Supabase email link
// config phải trỏ tới `${SITE_URL}/${locale}/auth/callback`. Redirect sau
// auth cũng phải có locale prefix.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as m from '@/paraglide/messages';

export async function GET(request: NextRequest) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get('code');
  // Lấy locale segment từ URL hiện tại (/[locale]/auth/callback → [locale]).
  const localeSegment = pathname.split('/')[1] ?? 'vi';

  // next param mặc định về dashboard của locale hiện tại.
  const next = searchParams.get('next') ?? `/${localeSegment}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Có lỗi → redirect về trang error của locale hiện tại.
    return NextResponse.redirect(
      `${origin}/${localeSegment}/error?message=${encodeURIComponent(error.message)}`,
    );
  }

  // Không có code (link lỗi hoặc vào trực tiếp)
  return NextResponse.redirect(
    `${origin}/${localeSegment}/error?message=${encodeURIComponent(m.auth_callback_missing_code())}`,
  );
}
