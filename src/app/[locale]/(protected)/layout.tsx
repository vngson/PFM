// Layout cho mọi trang cần đăng nhập. Kiểm tra session bằng getUser()
// (an toàn hơn getSession vì verify JWT với Supabase).
// Nếu chưa login → redirect về /login.
// Fetch accounts + categories song song để cấp cho QuickAddForm (FAB).
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NavLinks } from '@/features/dashboard/nav-links';
import { MobileNav, QuickAddFab } from '@/features/dashboard/mobile-nav';
import { BrandLogo } from '@/components/branding/brand-logo';
import { UserAvatar } from '@/components/branding/user-avatar';
import { PageTransition } from '@/components/branding/page-transition';
import { SearchTrigger } from '@/features/search/search-trigger';
import { QuickAddForm } from '@/features/transactions/quick-add-form';
import { ScrollToTop } from '@/components/scroll-to-top';
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

  // min-h-dvh (dynamic viewport height) thay vì min-h-svh để layout root
// theo visible viewport hiện tại, kể cả khi mobile address bar ẩn/hiện.
// Quan trọng cho MobileNav fixed bottom-0: trên mobile Safari/Chrome,
// 'fixed' neo theo layout viewport (~844px), còn visual viewport thay đổi
// theo address bar (~750px khi bar hiện, ~844 khi ẩn). Nếu layout root
// dùng 100svh (=750px), bar ở y=780 nằm ngoài visible area → user thấy
// khoảng trống dưới skeleton. dvh sync với visual viewport nên bar luôn
// sát mép dưới màn hình user nhìn thấy.
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b-4 border-border bg-card shadow-brutal">
        {/* Header 1 dòng. Mobile <sm: BrandLogo chỉ "PFM" (gọn ~50px).
           ≥sm: hiện thêm "MONEY".
           Tablet ≥md: NavLinks hiện cùng BrandLogo.
           ≥lg (1024px+): header center với max-w-6xl + padding rộng
           — desktop cảm giác centered. Tablet <lg: full-width, không
           center constraint để tránh content bị hẹp + scroll ngang. */}
        <div className="flex w-full items-center justify-between gap-2 px-4 py-3 sm:gap-3 md:px-6 lg:mx-auto lg:max-w-6xl">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
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
      <main id="main-content" className="min-h-[60vh] flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <QuickAddForm
        accounts={accounts ?? []}
        categories={categories ?? []}
      />
      <ScrollToTop />
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
      {/* MobileNav + QuickAddFab đặt ngoài <main> và sau <footer> trong DOM tree,
          dùng fixed nên không chiếm flex space — chỉ render ở đáy viewport.
          Đặt ngoài flex column để đảm bảo footer chiếm bottom-most flex slot. */}
      <MobileNav />
      <QuickAddFab />
    </div>
  );
}
