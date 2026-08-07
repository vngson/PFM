'use client';

// LanguageSwitcher: dropdown vi/en. Click → navigate sang localized URL của
// page hiện tại (vd /vi/dashboard → /en/dashboard) thay vì chỉ đổi cookie.
//
// Strategy URL-first: cookie alone có race condition giữa SSR AsyncLocalStorage
// và client init → triệt để thì URL quyết định locale. Khi user đổi ngôn ngữ,
// ta navigate tới URL localized của cùng path → server re-render với locale mới.
//
// Project routes là app/[locale]/* — baseLocale (vi) BẮT BUỘC phải có prefix.
// paraglide localizeUrl() mặc định bỏ prefix cho baseLocale → land vào
// /dashboard (no match) → 404. Workaround: buildLocalizedHref từ
// @/lib/i18n/locale-path (auto-extend khi thêm locale mới).
import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  setLocale,
  getLocale,
  locales,
  baseLocale,
  buildLocalizedHref,
  isKnownLocale,
  type Locale,
} from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const LABEL: Record<Locale, () => string> = {
  vi: () => m.settings_locale_vi(),
  en: () => m.settings_locale_en(),
};

export function LanguageSwitcher() {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const current = getLocale();
  const safeCurrent: Locale = isKnownLocale(current) ? current : baseLocale;

  function change(locale: Locale) {
    if (locale === safeCurrent) return;
    startTransition(() => {
      const target = buildLocalizedHref(pathname ?? '/', locale);
      // Cookie hint cho lần truy cập sau. URL là source of truth cho lần này.
      setLocale(locale, { reload: false });
      window.location.href = target;
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.language_switcher_aria()}
            disabled={pending}
          >
            <Languages className="size-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            nativeButton={false}
            onClick={() => change(loc)}
            className={loc === safeCurrent ? 'bg-secondary/40' : undefined}
          >
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {loc}
            </span>
            <span>{LABEL[loc]()}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}