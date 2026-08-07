---
phase: 25
batch: full
status: PASS
date: 2026-08-02
---

# Phase 25 — Full i18n Migration: PASS

## Summary

Migrated **every** hardcoded Vietnamese string in user-visible surfaces to Paraglide message keys. Toggling locale in `LanguageSwitcher` now flips the entire UI to English (and back to Vietnamese) without code changes. Build is green.

## Approach

3 patterns (from plan §Strategy):
- **A — Direct call**: `m.foo_bar()` for static strings
- **B — Parametric**: `m.foo({ name: '...' })` for placeholders
- **C — Record/K maps**: `{ value: 'income', label: () => m.foo_income() }` for enum keys

Server action errors: localize on server via `m.*()` + AsyncLocalStorage (proxy.ts populates).

Zod schemas: factory pattern `(t: Messages) => z.object({...})`, callers pass `m` directly.

## Batches

| Batch | Scope | Status |
|-------|-------|--------|
| 25.1 | Auth + landing + onboarding | ✅ |
| 25.2 | App pages + nav | ✅ |
| 25.3 | Forms + lists (CRUD UI) | ✅ |
| 25.4 | Server actions + factory schemas (zod) | ✅ |
| 25.5 | Settings + dashboard charts + search + theme + a11y | ✅ |
| 25.6 | Intl locale swap (`'vi-VN'` → `getNumberLocale()`) + final verify | ✅ |

## Files Modified (cumulative across all batches)

- **Auth**: `actions.ts`, `login-form.tsx`, `signup-form.tsx`, `schema.ts`
- **Schemas**: `accounts/schema.ts`, `categories/schema.ts`, `transactions/schema.ts`, `budgets/schema.ts`, `recurring/schema.ts`, `settings/schema.ts`
- **Actions**: 7 server-action files
- **Forms**: 6 feature form components
- **Lists**: 6 feature list components
- **Dashboard**: `page.tsx`, `dashboard-charts.tsx`, `monthly-trend-line.tsx`, `category-breakdown.tsx`, `account-balances-bar.tsx`
- **Settings**: `page.tsx`, `profile-form.tsx`, `password-form.tsx`, `sessions-card.tsx`, `export-data-card.tsx`, `delete-account-card.tsx`
- **Search**: `search-trigger.tsx`, `command-palette.tsx`, `actions.ts`
- **Recurring**: `recurring-list.tsx`, `recurring-form.tsx`, `frequency.ts`, `calendar-view.tsx`
- **Transactions**: `transaction-list.tsx`, `transaction-form.tsx`, `quick-add-form.tsx`, `filter-chip-row.tsx`, `load-more.tsx`, `search-box.tsx`
- **Components**: `theme/theme-toggle.tsx`, `a11y/skip-link.tsx`, `i18n/language-switcher.tsx`, `branding/brand-logo.tsx`, `branding/user-avatar.tsx`, `branding/page-transition.tsx`
- **Pages**: dashboard, accounts, categories, budgets, recurring, transactions, settings, auth pages, landing
- **Lib**: `src/lib/format.ts` (new) — `getNumberLocale()`, `formatCurrency()`

## Message Keys Added

~180+ new keys across `messages/vi.json` + `messages/en.json`. Categories:
- `app_*` (name, tagline)
- `nav_*` (8 items)
- `greeting_*` (2)
- `dashboard_*` (15)
- `settings_*` (~40 incl. profile, password, sessions, export, delete)
- `auth_*` (~15)
- `quick_add_*` (~12)
- `language_switcher_*` (2)
- `theme_*` (5)
- `skip_link_*` (1)
- `common_*` (~20)
- `onboarding_*` (~12)
- `accounts_*` (~30)
- `categories_*` (~30)
- `budgets_*` (~25)
- `transactions_*` (~30)
- `recurring_*` (~25 incl. calendar weekdays)
- `search_*` (~15)
- `chart_*` (~15)
- `user_avatar_*` (1)
- `zod_*` (~30 validation messages)
- `action_*` (~10 server error messages)

## Verification

```bash
pnpm paraglide:compile  # OK
pnpm build              # ✓ Compiled successfully in ~8s
                        # ✓ TypeScript: 0 errors
                        # ✓ 17/17 pages generated
                        # ✓ All routes (/, /accounts, /auth/*, /budgets,
                        #    /categories, /check-email, /dashboard, /error,
                        #    /login, /recurring, /settings, /signup,
                        #    /transactions) — no compile errors
```

## Remaining `'vi-VN'` References (intentional)

5 occurrences remain in code, all are **data values** (locale identifier stored in DB), not UI strings:
1. `src/lib/format.ts` — helper source of truth
2. `src/features/auth/actions.ts:71` — default signup locale
3. `src/app/(protected)/settings/page.tsx:35` — fallback for profiles with no locale
4. `src/features/settings/schema.ts:33` — `z.enum(['vi-VN', 'en-US'])` valid values
5. `src/features/settings/profile-form.tsx:43` — locale option value in dropdown

## Known Limitations

- `<input type="date">` still uses browser-default locale (out of scope)
- Transactional emails not localized (out of scope)
- Pluralization uses separate keys per branch (no ICU plurals)

## Next Phase

Phase 26: TBD per roadmap.