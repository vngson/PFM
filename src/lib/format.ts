// Locale-aware number/date formatters for the PFM app.
// Dùng getLocale() từ Paraglide runtime để chuyển format
// theo ngôn ngữ user chọn (vi → vi-VN, en → en-US).

import { getLocale } from '@/paraglide/runtime';

/** Map Paraglide locale → Intl BCP-47 locale. */
function toBcp47(locale: string): string {
  switch (locale) {
    case 'vi':
      return 'vi-VN';
    case 'en':
      return 'en-US';
    default:
      return 'vi-VN';
  }
}

/** Locale hiện tại dạng BCP-47 cho Intl.NumberFormat / Intl.DateTimeFormat. */
export function getNumberLocale(): string {
  return toBcp47(getLocale());
}

/** Format tiền tệ theo locale hiện tại. */
export function formatCurrency(amount: number, code: string): string {
  return new Intl.NumberFormat(getNumberLocale(), {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format compact number cho chart Y-axis (1k, 1tr, 1t cho vi; 1K, 1M, 1B cho en). */
export function formatCurrencyCompact(amount: number, code: string): string {
  const locale = getLocale();
  if (locale === 'vi') {
    if (amount === 0) return '0';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}t${code}`;
    if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}tr${code}`;
    if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}k${code}`;
    return `${amount}${code}`;
  }
  // English compact
  return new Intl.NumberFormat(getNumberLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}
