// Layout cho mọi trang cần đăng nhập. Kiểm tra session bằng getUser()
// (an toàn hơn getSession vì verify JWT với Supabase).
// Nếu chưa login → redirect về /login.
// Fetch accounts + categories song song để cấp cho QuickAddForm (FAB).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NavLinks } from '@/features/dashboard/nav-links';
import { MobileNav } from '@/features/dashboard/mobile-nav';
import { BrandLogo } from '@/components/branding/brand-logo';
import { UserAvatar } from '@/components/branding/user-avatar';
import { PageTransition } from '@/components/branding/page-transition';
import { SearchTrigger } from '@/features/search/search-trigger';
import { QuickAddForm } from '@/features/transactions/quick-add-form';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import * as m from '@/paraglide/messages';

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Locale-aware login redirect.
    redirect(`/${locale}/login`);
  }

  // Parallel fetch cho QuickAddForm FAB.
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, currency_code, color, icon_name')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    supabase
      .from('categories')
      .select('id, name, type, icon_name, color')
      .eq('user_id', user.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true }),
  ]);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="border-b-4 border-border bg-card shadow-brutal">
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-3 whitespace-nowrap px-6 py-3">
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <BrandLogo />
            <NavLinks />
          </div>
          <div className="flex items-center gap-2">
            <SearchTrigger />
            <LanguageSwitcher />
            <ThemeToggle />
            <UserAvatar email={user.email ?? ''} />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <QuickAddForm
        accounts={accounts ?? []}
        categories={categories ?? []}
      />
      <MobileNav />
      <footer className="border-t-4 border-border bg-card py-3">
        <nav
          aria-label="Legal"
          className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-6 text-xs text-muted-foreground"
        >
          <Link
            href={`/${locale}/privacy`}
            className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {m.legal_nav_privacy()}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href={`/${locale}/terms`}
            className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {m.legal_nav_terms()}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
