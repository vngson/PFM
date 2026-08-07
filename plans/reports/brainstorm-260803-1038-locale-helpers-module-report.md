---
title: Locale Helpers Module + PFM Audit
date: 2026-08-03
type: brainstorm
status: approved
project: personal-finance-manager
---

# Brainstorm: Locale Helpers Module + PFM Audit

## Problem statement

`localizeHref` từ paraglide v2 mặc định bỏ prefix cho `baseLocale` (vi). Project routes là `app/[locale]/*` — URL `/dashboard` không match → 404 cho Vietnamese user. Hiện: 23 call sites / 14 files bị ảnh hưởng, gồm 4 `redirect()` calls trong auth actions.

Cùng với đó, đợt audit toàn project phát hiện 9 issues khác (đã documented trong `general-purpose-260803-1039-pfm-audit-report.md`).

## User decision (this round)

- **Scope**: Group 1 only — locale module + migration + vitest tests
- **Skip**: Dashboard dedupe, form validation, patch hook, lucide migration, font trim, CVE verification
- **Module location**: `src/lib/i18n/locale-path.ts`
- **Tests**: Vitest unit tests

## Design

### Module API

```ts
// src/lib/i18n/locale-path.ts
export { locales, baseLocale, getLocale, setLocale } from '@/paraglide/runtime';
export type { Locale } from '@/paraglide/runtime';

export function isKnownLocale(v: string | undefined): v is Locale;
export function buildLocalizedHref(pathname: string, locale: Locale): string;
```

Internal: `LOCALE_SET` (Set for O(1) lookup), `stripLocalePrefix` (private).

### Migration patterns

**Client component** (uses `usePathname`):
```tsx
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
<Link href={buildLocalizedHref("/dashboard", getLocale())} />
```

**Server component / server action**:
```tsx
import { redirect } from 'next/navigation';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
redirect(buildLocalizedHref('/dashboard', getLocale()));
```

### Files to touch

| Action | Files |
|--------|-------|
| CREATE | `src/lib/i18n/locale-path.ts`, `src/lib/i18n/locale-path.test.ts`, `vitest.config.ts` |
| EDIT | `package.json` (vitest deps + scripts) |
| EDIT | 14 files using `localizeHref` |
| EDIT | `src/features/auth/actions.ts`，`src/features/accounts/actions.ts` (bare redirect) |
| EDIT | `src/components/i18n/language-switcher.tsx` (remove inline helpers) |

## Success criteria

- [ ] `pnpm test` passes (8+ locale path tests)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm build` succeeds
- [ ] Manual: VI user clicks link → `/vi/...` (was `/...` → 404)
- [ ] Manual: Fresh login → lands on `/vi/dashboard` not `/dashboard`
- [ ] No `localizeHref` left in app code

## Risks

- **Low**: Edge case for absolute URLs in `localizeHref` may not be matched. Mitigation: only relative paths used in app code (verified by grep).
- **Medium**: If helper mishandles query/hash, breaks nav filters. Mitigation: tests cover these (mirroring ref project).

## Out of scope (Group 2 — separate brainstorm)

- Dashboard dedupe fetches (HIGH)
- Transaction form validation (HIGH)
- Pre-compile patch hook (MEDIUM)
- Lucide-react v1→v0 migration (deprecation)
- Lexend weight 600 trim (LOW)
- CVE-2026-64642 verification (needs WebSearch)
- Replace `console.error` with logger (MEDIUM)
- 7 `as never` casts unsafe (MEDIUM)
- `ilike` escape bug (LOW)

## Reference

- Ref project: `mirailand-service-marketplace/apps/web/src/shared/i18n/resolve-locale.ts`
- Ref project tests: `mirailand-service-marketplace/apps/web/src/shared/i18n/__tests__/resolve-locale.test.ts`
- Full PFM audit: `plans/reports/general-purpose-260803-1039-pfm-audit-report.md`
