// Browser client — dùng trong Client Components ("use client")
// Pattern chuẩn từ @supabase/ssr cho Next.js 15
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
