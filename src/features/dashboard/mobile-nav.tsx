'use client';

// MobileNav: bottom navigation cho mobile (< 768px). 4 nav chính +
// 1 FAB trung tâm cho Quick Add (mở QuickAddForm).
// Giảm tải header trên mobile, tăng thumb reach.
// Href buildLocalizedHref để URL khớp locale prefix.
//
// Dùng createPortal render trực tiếp vào document.body để hoàn toàn thoát khỏi
// flex/grid layout — đảm bảo bottom bar luôn ở đáy viewport bất kể
// loading skeleton ngắn hay page content height thay đổi.
//
// === Visual-viewport-correct positioning (CSS-only) ===
// `position: fixed; bottom: 0` neo theo LAYOUT viewport (~844px iPhone 14),
// không theo VISUAL viewport (mobile Safari address bar ẩn/hiện làm
// visual viewport co/giãn ~750↔844). Hệ quả: khi address bar visible, bar
// nằm ngoài visible area 30-90px → user thấy khoảng đen dưới skeleton.
//
// Fix: bọc bar trong wrapper `position: fixed; inset: 0; height: 100dvh`
// (dynamic viewport = visual viewport hiện tại), `flex flex-col justify-end`,
// `pointer-events-none` ngoài / `pointer-events-auto` trên nav. Khi address
// bar collapse → wrapper grow → bar vẫn ở bottom của wrapper = visual
// viewport bottom. Khi browser không support dvh → fallback 100vh (luôn = 844
// = layout viewport) → bar ở đáy layout viewport (chấp nhận được trên
// desktop và mobile browser hiện đại đều support dvh từ Safari 15.4).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  // Chỉ render portal sau khi mount trên client để tránh hydration mismatch.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    // Wrapper full visual viewport (100dvh = dynamic = hiện tại). Khi mobile
    // address bar ẩn/hiện, dvh resize → wrapper re-layout → bar (justify-end)
    // luôn ở đáy wrapper = đáy visual viewport user nhìn thấy.
    // pointer-events-none trên wrapper để không chặn click ngoài bar;
    // pointer-events-auto trên nav để nav vẫn nhận tap.
    <div
      aria-hidden="false"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
      style={{ height: '100dvh' }}
    >
      <nav
        aria-label="Mobile navigation"
        className="pointer-events-auto border-t-2 border-border bg-card shadow-[0_-4px_0_0_var(--border)]"
      >
        {/* Full-width bar — không max-w-md để 4 nav chính chia đều
           mọi viewport. FAB tách hẳn ra khỏi bar (fixed bên dưới).

           === Icon-only on mobile ===
           UI-UX ProMax Mobile Bottom Nav: tiếng Anh "Transactions"/"Accounts"
           dài 12+ chars, label visible tràn sang tab kế trên viewport 390px
           (chia 4 = ~73px/tab). Material Design + Apple HIG đều khuyến nghị
           icon-only cho mobile bottom nav, label hiện qua tooltip (title)
           + aria-label cho a11y (screen reader). Active state vẫn dùng
           inner pill giữ layout slot ổn định, không jump. */}
        <div className="flex w-full items-end justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {links.map((link) => {
            const Icon = link.icon;
            const localizedHref = buildLocalizedHref(link.href, getLocale());
            const active = pathname === localizedHref || pathname?.startsWith(localizedHref + '/');
            const label = link.label();
            return (
              <Link
                key={link.href}
                href={localizedHref}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                title={label}
                className={cn(
                  // 48pt touch target (Apple HIG). flex-1 để 4 nav chia đều.
                  'flex min-h-12 flex-1 items-center justify-center px-1 py-1.5',
                )}
              >
                {/* Inner pill — neo-brutalism: bg vàng active, border đen.
                    Border-2 transparent ở inactive giữ slot không shift.
                    Icon-only nhưng visible label có thể quay lại bằng cách
                    thêm text-[10px] + truncate 1 dòng nếu sau này muốn. */}
                <span
                  className={cn(
                    'inline-flex size-12 items-center justify-center rounded-md border-2 transition-all motion-safe:active:scale-95',
                    active
                      ? 'border-border bg-secondary text-secondary-foreground shadow-brutal-sm'
                      : 'border-transparent text-muted-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-6 shrink-0',
                      active ? 'text-secondary-foreground' : 'text-muted-foreground',
                    )}
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>,
    document.body,
  );
}

/**
 * QuickAddFab — nút + floating trên mobile, đặt hẳn ra ngoài MobileNav
 * (fixed bottom-right) để không che labels của 4 nav chính.
 * Wrapper `height: 100dvh` + `justify-end` + `bottom: 20` trên button
 * → FAB cách bottom visual viewport 5rem, ngay trên MobileNav.
 * pointer-events-none trên wrapper / auto trên button.
 */
export function QuickAddFab() {
  const [open, setOpen] = useState(false);
  function openQuickAdd() {
    window.dispatchEvent(new CustomEvent('pfm:open-quick-add'));
    setOpen(false);
  }
  return (
    // Wrapper full visual viewport (100dvh). FAB absolute bottom-20 (cách đáy
    // 5rem = 80px, ngay trên MobileNav cao ~64px) + safe-area-inset-bottom.
    // Absolute (không flex) để bottom offset hoạt động độc lập với flex layout
    // của wrapper. pointer-events-none wrapper / auto button.
    <div
      className="pointer-events-none fixed inset-0 z-40 lg:hidden"
      style={{ height: '100dvh' }}
    >
      <button
        type="button"
        aria-label={m.quick_add_aria()}
        aria-expanded={open}
        onClick={openQuickAdd}
        className="pointer-events-auto absolute right-4 inline-flex size-14 items-center justify-center border-2 border-border bg-primary text-primary-foreground shadow-brutal motion-safe:transition-transform hover:scale-105 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-safe:active:transition-none"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="size-6" aria-hidden />
      </button>
    </div>
  );
}