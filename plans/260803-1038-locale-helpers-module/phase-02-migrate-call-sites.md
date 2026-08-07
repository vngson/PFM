---
phase: 2
title: "Migrate localizeHref + redirect calls"
status: pending
priority: P1
dependencies: [1]
---

# Phase 2: Migrate localizeHref + redirect calls

## Overview

Replace 23 `localizeHref` calls trong 14 files + 4 bare `redirect()` calls trong 2 auth files sang helper mới. Verify với grep không còn `localizeHref` trong app code.

## Requirements

- Functional: mọi `<Link href>` và `redirect()` dùng `/vi/...` prefix khi locale=vi
- Non-functional: KHÔNG touch logic khác; minimal diff

## Architecture

3 patterns:

**Pattern 1 — Client component dùng `usePathname`**:
```tsx
// Before
import { localizeHref } from '@/paraglide/runtime';
<Link href={localizeHref("/dashboard")} />

// After
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
<Link href={buildLocalizedHref("/dashboard", getLocale())} />
```

**Pattern 2 — Server component (no pathname)**:
```tsx
// Before
import { localizeHref } from '@/paraglide/runtime';
<Link href={localizeHref("/dashboard")} />

// After
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
<Link href={buildLocalizedHref("/dashboard", getLocale())} />
```

**Pattern 3 — Server action redirect**:
```tsx
// Before
import { redirect } from 'next/navigation';
redirect('/dashboard');

// After
import { redirect } from 'next/navigation';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
redirect(buildLocalizedHref('/dashboard', getLocale()));
```

## Related Code Files

### Client/server components (14 files, 23 calls)

- `src/app/[locale]/(auth)/check-email/page.tsx`
- `src/app/[locale]/(auth)/error/page.tsx`
- `src/app/[locale]/(protected)/transactions/page.tsx`
- `src/app/[locale]/(protected)/dashboard/page.tsx`
- `src/app/[locale]/(protected)/recurring/page.tsx`
- `src/app/[locale]/(protected)/budgets/page.tsx`
- `src/components/branding/brand-logo.tsx`
- `src/components/branding/user-avatar.tsx`
- `src/features/dashboard/nav-links.tsx`
- `src/features/dashboard/mobile-nav.tsx`
- `src/features/auth/signup-form.tsx`
- `src/features/auth/login-form.tsx`
- `src/features/onboarding/wizard.tsx`
- `src/features/transactions/load-more.tsx`

### Server actions (2 files, 4 bare redirects)

- `src/features/auth/actions.ts` — `redirect('/dashboard')`, `redirect('/login')`, `redirect('/check-email')`
- `src/features/accounts/actions.ts` — `redirect('/accounts')`

### Special case

- `src/components/i18n/language-switcher.tsx` — đã fix trước đó với inline helpers. Refactor sang import từ module mới, bỏ inline helpers.

## Implementation Steps

### 1. Sweep 14 component files

Với mỗi file, replace:
- `import { ..., localizeHref } from '@/paraglide/runtime';` → `import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';` (giữ các import khác)
- `localizeHref("X")` → `buildLocalizedHref("X", getLocale())`

Đặc biệt: `transactions/page.tsx`, `recurring/page.tsx`, `budgets/page.tsx`, `nav-links.tsx`, `user-avatar.tsx` có nhiều calls → batch update.

### 2. Sweep 2 auth action files

Trong `src/features/auth/actions.ts` — 3 `redirect()` calls với paths `/dashboard`, `/login`, `/check-email`. Convert sang `buildLocalizedHref(..., getLocale())`.

Trong `src/features/accounts/actions.ts` — 1 `redirect('/accounts')`. Convert.

### 3. Refactor `language-switcher.tsx`

Bỏ inline `LOCALE_SET`, `isKnownLocale`, `stripLocalePrefix`, `buildLocalizedHref`. Import từ `@/lib/i18n/locale-path`. Keep `setLocale`, `getLocale`, `locales`, `baseLocale`, `Locale` imports từ module (re-export).

### 4. Verify với grep

```bash
grep -rn 'localizeHref' /run/media/sonvn/DATA/Source/personal-finance-manager/src --include='*.tsx' --include='*.ts'
# Expected: 0 matches (only `localizeHref` import in `language-switcher.tsx` removed)
```

## Success Criteria

- [ ] `grep -rn 'localizeHref' src/` returns 0
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm test` vẫn passes
- [ ] Server-action smoke test: signup flow → land `/vi/dashboard` or `/vi/login` (không phải `/dashboard`)

## Risk Assessment

- **Medium**: TypeScript inference cho `getLocale()` trong server context — returns `Locale | undefined`. Mit: pass qua `isKnownLocale` guard hoặc assert theo pattern ref project (`const locale = isKnownLocale(raw) ? raw : baseLocale`).
- **Low**: Một số file có thể đã import `localizeHref` không dùng. Mit: clean up imports khi migrate.
- **Low**: Search/hash params trong existing `localizeHref` calls có thể xử lý khác. Mit: 23 calls đều dùng plain strings (verified by audit agent), không có edge case.
