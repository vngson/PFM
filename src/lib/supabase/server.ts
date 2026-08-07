// Server client — dùng trong Server Components, Server Actions, Route Handlers
// Đọc/ghi cookies qua Next.js cookies() API
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Lấy Supabase client phía server. Tự động forward cookies từ request
 * và ghi lại cookies mới vào response (cho việc refresh session).
 *
 * Lưu ý: trong Next.js 15 `cookies()` là async — phải await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Bị gọi từ Server Component (read-only context).
            // Bỏ qua — middleware sẽ refresh session.
          }
        },
      },
    },
  );
}
