'use client';

// MobileNav: bottom navigation cho mobile (< 768px). 4 nav chính +
// 1 FAB trung tâm cho Quick Add (mở QuickAddForm).
// Giảm tải header trên mobile, tăng thumb reach.
// Href buildLocalizedHref để URL khớp locale prefix.
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Wallet, Target, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface NavLink {
  href: string;
  label: () => string;
  icon: typeof LayoutDashboard;
}

const links: NavLink[] = [
  { href: '/dashboard', label: () => m.nav_overview(), icon: LayoutDashboard },
  { href: '/transactions', label: () => m.nav_transactions(), icon: Receipt },
  { href: '/accounts', label: () => m.nav_accounts(), icon: Wallet },
  { href: '/budgets', label: () => m.nav_budgets(), icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const [fabOpen, setFabOpen] = useState(false);

  function openQuickAdd() {
    window.dispatchEvent(new CustomEvent('pfm:open-quick-add'));
    setFabOpen(false);
  }

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card shadow-[0_-4px_0_0_var(--border)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-end justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {links.map((link) => {
          const Icon = link.icon;
          const localizedHref = buildLocalizedHref(link.href, getLocale());
          const active = pathname === localizedHref || pathname?.startsWith(localizedHref + '/');
          return (
            <Link
              key={link.href}
              href={localizedHref}
              className={cn(
                'flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors active:scale-95 motion-safe:active:transition-transform',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon
                className={cn('size-5', active && 'fill-current text-secondary')}
                aria-hidden
              />
              <span className="font-heading text-[10px] font-bold uppercase tracking-wider">
                {link.label()}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label={m.quick_add_aria()}
          aria-expanded={fabOpen}
          onClick={openQuickAdd}
          className="-mt-6 inline-flex size-14 items-center justify-center border-2 border-border bg-primary text-primary-foreground shadow-brutal motion-safe:transition-transform hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-safe:active:transition-none"
        >
          <Plus className="size-6" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
