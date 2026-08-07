# Batch 24 — i18n with inlang Paraglide JS

Status: DONE

## Scope

Wire multi-language (vi + en) into the PFM app using inlang Paraglide JS v2. Cookie-based locale detection, no URL localization, compose with existing Supabase auth proxy.

## Decisions

- **Cookie strategy only** — no URL prefix (project URLs stay `/dashboard`, `/transactions`). Strategy `['cookie', 'globalVariable', 'baseLocale']`.
- **baseLocale = vi** — default Vietnamese; English opt-in via switcher.
- **Server-side message functions** — Paraglide compiles tree-shakeable JS modules, `m.*()` calls resolve at render time from AsyncLocalStorage populated by `paraglideMiddleware`.
- **Compose with auth** — Next.js 16 allows 1 root middleware (renamed to `proxy.ts`); we run `updateSession` then `paraglideMiddleware` in a single proxy.
- **Deprecated `@inlang/paraglide-next` removed** — replaced with raw `paraglideMiddleware` from compiled `src/paraglide/server.js`.

## Files Created

- `project.inlang/settings.json` — baseLocale vi, locales vi+en, message-format plugin pointing at `messages/{locale}.json`.
- `messages/vi.json` + `messages/en.json` — 30 message keys.
- `src/paraglide/` — compiled output from `paraglide-js compile`. Tree-shakeable messages.
- `src/components/i18n/language-switcher.tsx` — client dropdown, `setLocale()` + `useTransition`.

## Files Modified

- `src/proxy.ts` — composed `updateSession` → `paraglideMiddleware(request, ({ request }) => Promise.resolve(authResponse))`. Merges Set-Cookie + `x-paraglide-locale` headers from paraglide response onto `authResponse`.
- `src/features/dashboard/nav-links.tsx` — labels via `m.nav_overview()` / `m.nav_transactions()` etc.
- `src/app/(protected)/dashboard/page.tsx` — greeting `m.greeting_hello({ name })`, currency label, today's chip.
- `src/app/(protected)/settings/page.tsx` — title + subtitle.
- `src/features/auth/login-form.tsx` — `m.auth_login_title()`.
- `src/features/auth/signup-form.tsx` — `m.auth_signup_title()`.
- `src/app/(auth)/check-email/page.tsx` — `m.auth_check_email()`.
- `src/features/transactions/quick-add-form.tsx` — `m.quick_add_btn()` for FAB.
- `src/app/(protected)/layout.tsx` — mounted `<LanguageSwitcher />` in header.
- `package.json` — added `"paraglide:compile": "paraglide-js compile --project ./project.inlang --outdir ./src/paraglide"`.

## Errors + Fixes

1. **TS: `Property 'dashboard_today' does not exist on type 'number'`** — `const [y, m]` shadowed the `import * as m from '@/paraglide/messages'` binding. Renamed destructured month to `monthNum`.
2. **TS: `paraglideMiddleware` "Expected 2-3 arguments, but got 1"** — first attempt called it as a factory `paraglideMiddleware(handler)`. Correct API is `paraglideMiddleware(request, resolve, options?)` returning `Response`. Refactored proxy to pass `authResponse` through the resolve callback so paraglide can wrap it.
3. **Stale compiled output** — first build ran with messages directory missing the 30 new functions (only `example_message` from scaffold). Re-ran `pnpm paraglide:compile` to regenerate `_index.js` with all 30 message exports.

## Build Verify

```
✓ Compiled successfully in 7.9s
✓ TypeScript clean
✓ Static pages 17/17
ƒ Proxy (Middleware)
```

All 14 routes + proxy compiled. No TS errors.

## Verification Steps for User

1. Open `/dashboard` — should render Vietnamese.
2. Click globe icon in header → "English" → page reloads → all `m.*()` strings now English.
3. Inspect DevTools → Application → Cookies → `PARAGLIDE_LOCALE=en`.
4. Navigate between routes — locale persists (cookie-based).
5. Open `/login` → form title now English.

## Pending (Phase 25)

- Server action error messages (currently Vietnamese hardcoded in actions.ts).
- Toast messages (toast.text() currently vi-only).
- Profile form labels (locale, currency).
- User dropdown menu labels (Cài đặt, Đăng xuất, etc).

## Open Questions

- Should `language_switcher_label` map be in `messages/` (it already is) but the dropdown items themselves show `loc` code + native name — fine?
- `greeting_hello` uses `👋` emoji in both locales — keep or strip for English brand voice?

## Unresolved

None — Phase 24 ready for review.
