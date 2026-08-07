---
phase: 1
title: "Module + Vitest Setup"
status: pending
priority: P1
dependencies: []
---

# Phase 1: Module + Vitest Setup

## Overview

Tạo `src/lib/i18n/locale-path.ts` với `buildLocalizedHref` + `isKnownLocale` + `stripLocalePrefix`. Setup vitest config + 8 unit tests. Tests phải PASS trước khi migrate (red → green lock-in).

## Requirements

- Functional: helper xử lý đúng 8+ edge cases (mirror ref project)
- Non-functional: 0 deps mới ngoài vitest; reuse paraglide runtime exports

## Architecture

Module nằm trong `src/lib/i18n/` (directory đã tồn tại, empty). Helper thuần function, không state. Re-export các giá trị cần thiết từ paraglide runtime để UI import 1 chỗ.

```
src/lib/i18n/locale-path.ts         (40 lines)
src/lib/i18n/locale-path.test.ts    (60 lines, 8 tests)
vitest.config.ts                    (10 lines)
package.json                        (edit: vitest deps + scripts)
```

## Related Code Files

- Create: `src/lib/i18n/locale-path.ts`
- Create: `src/lib/i18n/locale-path.test.ts`
- Create: `vitest.config.ts`
- Edit: `package.json` (add `vitest`, `test`, `test:watch` scripts)

## Implementation Steps

### 1. Install vitest

```bash
pnpm add -D vitest
```

### 2. Create `src/lib/i18n/locale-path.ts`

```ts
// Locale path helpers — workaround cho paraglide v2 localizeHref bug.
// paraglide 2.x mặc định bỏ prefix cho baseLocale (vi) → /dashboard không
// match app/[locale]/* routes. Helper này LUÔN giữ prefix, kể cả baseLocale.
//
// Pattern từ mirailand-service-marketplace/apps/web/src/shared/i18n/resolve-locale.ts
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
```

### 3. Create `src/lib/i18n/locale-path.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { isKnownLocale, buildLocalizedHref } from './locale-path';

describe('isKnownLocale', () => {
  it('accepts known locales', () => {
    expect(isKnownLocale('vi')).toBe(true);
    expect(isKnownLocale('en')).toBe(true);
  });
  it('rejects unknown values', () => {
    expect(isKnownLocale('fr')).toBe(false);
    expect(isKnownLocale(undefined)).toBe(false);
    expect(isKnownLocale('')).toBe(false);
  });
});

describe('buildLocalizedHref', () => {
  it('prefixes a single-segment path', () => {
    expect(buildLocalizedHref('/dashboard', 'vi')).toBe('/vi/dashboard');
    expect(buildLocalizedHref('/dashboard', 'en')).toBe('/en/dashboard');
  });
  it('returns the locale root for bare slash', () => {
    expect(buildLocalizedHref('/', 'vi')).toBe('/vi');
  });
  it('preserves nested segments', () => {
    expect(buildLocalizedHref('/a/b/c', 'en')).toBe('/en/a/b/c');
  });
  it('strips existing locale prefix before re-prefixing', () => {
    expect(buildLocalizedHref('/en/dashboard', 'vi')).toBe('/vi/dashboard');
    expect(buildLocalizedHref('/vi/dashboard', 'en')).toBe('/en/dashboard');
  });
  it('preserves unknown 2-letter segments (redirect-layer responsibility)', () => {
    expect(buildLocalizedHref('/fr/login', 'vi')).toBe('/vi/fr/login');
  });
  it('always prefixes baseLocale (vi)', () => {
    // The whole point of this helper — paraglide localizeHref drops prefix.
    expect(buildLocalizedHref('/dashboard', 'vi')).toBe('/vi/dashboard');
  });
  it('handles empty path', () => {
    expect(buildLocalizedHref('', 'vi')).toBe('/vi');
  });
  it('handles path with search + hash', () => {
    expect(buildLocalizedHref('/login?x=1#y', 'vi')).toBe('/vi/login?x=1#y');
  });
});
```

### 4. Create `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node', // No DOM needed for locale helpers
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### 5. Edit `package.json`

Add scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Add devDependency: `vitest` (installed via step 1).

## Success Criteria

- [ ] `pnpm test` runs and passes 8 tests
- [ ] `npx tsc --noEmit` clean
- [ ] Module file < 50 lines, test file < 80 lines
- [ ] No new runtime deps
- [ ] Exports `buildLocalizedHref`, `isKnownLocale`, `Locale`, `locales`, `baseLocale`, `getLocale`, `setLocale`

## Risk Assessment

- **Low**: vitest với Next.js có thể cần thêm config nếu helper imports `next/headers`. Mit: helper không touch Next.js, chỉ pure function.
- **Low**: `Locale` type re-export có thể conflict với file khác. Mit: distinct export name.
