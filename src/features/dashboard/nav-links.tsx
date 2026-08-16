'use client';

// NavLinks: dùng usePathname để highlight link hiện tại.
// Neo-brutalism: hard border + shadow cho active state.
// Chỉ giữ 4 nav chính. Nav phụ (Danh mục, Định kỳ, Cài đặt) chuyển vào user dropdown.
// Labels lấy từ Paraglide messages.
// href buildLocalizedHref chèn /en prefix khi cần.
// `vi` là baseLocale nên href tự nhiên là "/dashboard" (không prefix), `en` thành "/en/dashboard".
// URL khớp giữa SSR (paraglideMiddleware đọc URL) và client → không hydration mismatch.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Receipt, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface NavLink {
  href: string;
  label: () => string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
}

const links: NavLink[] = [
  { href: '/dashboard', label: () => m.nav_overview(), icon: LayoutDashboard },
  { href: '/transactions', label: () => m.nav_transactions(), icon: Receipt },
  { href: '/accounts', label: () => m.nav_accounts(), icon: Wallet },
  { href: '/budgets', label: () => m.nav_budgets(), icon: Target },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden flex-nowrap items-center gap-2 lg:flex">
      {/* Ẩn <md — MobileNav bottom bar đã chứa nav chính. */}
      {links.map((link) => {
        const Icon = link.icon;
        const localizedHref = buildLocalizedHref(link.href, getLocale());
        const active = pathname === localizedHref || pathname?.startsWith(localizedHref + '/');
        const isSoon = 'soon' in link && link.soon;
        return (
          <Link
            key={link.href}
            href={isSoon ? '#' : localizedHref}
            aria-disabled={isSoon}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 border-2 border-border px-3 py-1.5 font-heading text-xs font-bold uppercase tracking-wider transition-all motion-safe:hover:-translate-x-[2px] motion-safe:hover:-translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-safe:active:transition-none',
              active
                ? 'bg-secondary text-secondary-foreground shadow-brutal-sm'
                : 'bg-background text-foreground shadow-brutal-sm hover:bg-secondary/40',
              isSoon && 'pointer-events-none opacity-50',
            )}
          >
            <Icon className="size-4" />
            <span>{link.label()}</span>
            {isSoon ? (
              <span className="ml-0.5 text-[10px] uppercase tracking-wide opacity-70">
                {m.nav_soon_badge()}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
