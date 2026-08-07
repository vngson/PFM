// Root route cho locale cụ thể: redirect về dashboard nếu đã login, ngược lại về login.
// Locale được xác định bởi [locale] segment trong URL — phase 25 URL strategy.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }
  redirect(`/${locale}/login`);
}