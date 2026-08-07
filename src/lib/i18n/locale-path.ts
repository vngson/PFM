// Locale path helpers — workaround for paraglide v2 localizeHref bug.
// paraglide 2.x drops the URL prefix for baseLocale (vi), so /dashboard
// no longer matches the app/[locale]/* routes and 404s.
//
// This helper ALWAYS preserves the locale prefix, including for baseLocale.
//
// Pattern mirror: mirailand-service-marketplace/apps/web/src/shared/i18n/resolve-locale.ts
import { locales, baseLocale, getLocale, setLocale } from '@/paraglide/runtime';
import type { Locale } from '@/paraglide/runtime';

export { locales, baseLocale, getLocale, setLocale };
export type { Locale };

const LOCALE_SET: ReadonlySet<string> = new Set(locales);

export function isKnownLocale(value: string | undefined): value is Locale {
  return value !== undefined && LOCALE_SET.has(value);
}

/** Strip leading locale segment only when it matches a known locale.
 *  Unknown 2-letter segments (e.g. /fr/...) are preserved so the redirect
 *  layer can re-prefix them. */
function stripLocalePrefix(pathname: string): string {
  const head = pathname.split('/', 2)[1];
  if (head && isKnownLocale(head)) {
    const stripped = pathname.replace(/^\/[^/]+/, '');
    return stripped.length === 0 ? '/' : stripped;
  }
  return pathname;
}

/** Build `/<locale>/<rest>` — always preserves the prefix. */
export function buildLocalizedHref(pathname: string, locale: Locale): string {
  const rest = stripLocalePrefix(pathname);
  return `/${locale}${rest === '/' ? '' : rest}`;
}