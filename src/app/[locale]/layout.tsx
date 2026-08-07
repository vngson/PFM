// Layout cho mọi route có prefix /[locale]/*.
// Phase 25 URL strategy: paraglide resolve locale từ URL prefix qua
// paraglideMiddleware (proxy.ts) + AsyncLocalStorage. Layout này chỉ cần:
// 1. Validate params.locale nằm trong locales (defensive).
// 2. setLocale() cho paraglide server runtime (cookie + state).
// 3. Render children — <html>/<body> đã có ở root layout.tsx.
import { notFound } from 'next/navigation';
import { setLocale, locales, type Locale } from '@/paraglide/runtime';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  setLocale(locale as Locale);

  return <>{children}</>;
}