// Layout cho các trang public (privacy, terms) — header với BrandLogo +
// nút Trang chủ + LanguageSwitcher + ThemeToggle, footer với legal links.
// Khác với (protected) layout: không cần auth, không có NavLinks/QuickAddForm.
// Proxy.ts đã allowlist /privacy + /terms nên user đã soft-delete vẫn truy cập được.
import Link from 'next/link';
import { BrandLogo } from '@/components/branding/brand-logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getLocale();
  const homeHref = buildLocalizedHref('/', locale);
  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="border-b-4 border-border bg-card shadow-brutal">
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-3 whitespace-nowrap px-6 py-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <Link
              href={homeHref}
              className="border-2 border-border bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {m.public_back_home()}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
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