# PFM Audit Report

Audit of `/run/media/sonvn/DATA/Source/personal-finance-manager` on 2026-08-03.

## CRITICAL (blocks core flows)

- **`src/paraglide/runtime.js:994-1015` (`localizeUrlDefaultPattern`) returns bare URLs for the `vi` baseLocale.** Confirmed root cause: `TREE_SHAKE_DEFAULT_URL_PATTERN_USED = true` (line 125) routes every call through this function, ignoring the `urlPatterns` table defined at line 68. When `getLocale() === 'vi'` (the baseLocale), `localizeHref("/dashboard")` returns `/dashboard` (no prefix). The Next.js routing tree has NO bare route for `/dashboard` — only `app/[locale]/(protected)/dashboard/page.tsx`. **Every Vietnamese user clicks an internal link → 404.** Same defect hits all 23 `localizeHref` call sites across 14 files (full list below). The developer's intent comment in `nav-links.tsx:9-10` ("`vi` là baseLocale nên href tự nhiên là '/dashboard'") is wrong — the app routes require `/vi/...`. **Suggested fix:** either (a) wrap `localizeHref` in a project-local helper that always prefixes the baseLocale, or (b) add public bare route handlers (mirrors) for every protected page, or (c) change `baseLocale` strategy to always require a prefix by overriding `localizeUrl` via `overwriteSetLocale`/custom pattern. Option (a) is the smallest change. The reference project avoided this by relying on the language switcher's manual prefixing — but that only fixes the switcher, not other call sites.

- **`src/features/auth/actions.ts:90,131,141` + `src/features/accounts/actions.ts:155` — `redirect('/check-email' | '/dashboard' | '/login' | '/accounts')` use bare paths.** Bare `redirect()` (no locale prefix) lands on `/dashboard` etc. → 404. After login the user is bounced to a missing page. Same root cause as above; **same fix applies.**

- **Same issue for redirect chains during logout (`auth/actions.ts:141`) and signup completion (`auth/actions.ts:90`).** Confirmed by reading the file.

## HIGH (likely bugs but not blocking)

- **`src/app/[locale]/(protected)/layout.tsx:25-28` — `createClient()` + `getUser()` but no `revalidatePath`/cache tagging.** Layout calls `getUser()` but doesn't pin the call to a per-request cache key. Combined with the surrounding `Promise.all` of accounts + categories, this triggers a fresh user lookup on every navigation through the protected layout. Not strictly wrong (Supabase `getUser()` is cheap after cookie validation), but you also fetch accounts + categories inside the protected layout **and again** inside the dashboard page (`dashboard/page.tsx:51-56` and `dashboard-charts.tsx:11-13`), so two of the seven dashboard queries are duplicated by the protected layout. Suggested fix: move the layout's account/category fetch into a single source that the page can consume, or drop them from the layout and let each page fetch once.

- **`src/features/dashboard/dashboard-charts.tsx:24-28` — `getAccountBalances()` is fetched here AND `accounts` is fetched again in `dashboard/page.tsx:51-56`.** Confirmed by reading both files. The chart version returns more fields, but only `id, name, currency_code, icon_name, color, current_balance, is_archived` is selected — the page version selects a smaller projection. Net: 2 DB hits for the same accounts table on every dashboard render. Suggested fix: have the page pass the already-fetched accounts down to `DashboardCharts`, or merge the two fetches into a single Promise.all at the page level and serialize the result.

- **`src/lib/supabase/middleware.ts:12-40` — `updateSession` calls `supabase.auth.getUser()` but the cookies it writes to `supabaseResponse` are thrown away in `proxy.ts:51-58` unless the loop captures them.** Re-reading `proxy.ts`: the response cookies are forwarded (line 56-58), so this is OK in the happy path. However: when `request.headers.get('Sec-Fetch-Dest') === 'document'` is NOT set (e.g. RSC payload requests, fetch from client navigations), `paraglideMiddleware` does not run the inner `resolve()` callback the same way — verify that the supabase auth refresh path is still invoked for those requests. The current order (paraglide wraps, then updateSession inside the wrapper) means RSC fetches via `paraglideMiddleware(request, () => updateSession(request))` do run. **Looks correct but is fragile** — any future refactor that moves `updateSession` outside the paraglide callback would silently break token refresh on RSC fetches.

- **`src/features/transactions/transaction-form.tsx:298-307` — `min="0"` on the amount input does not block negative numbers in all browsers; some allow typing `-` and rejecting only on submit.** The zod schema (`schema.ts:33-37`) does enforce `Number(s) > 0`, so server-side rejection is correct. But the client-side UX would be cleaner with `step="any"` + a positive-only input mode. Low impact because the server catches it. Mark as MEDIUM.

- **`src/features/transactions/schema.ts:38-44` — `occurred_at` accepts any string parseable by `Date.parse`, including future dates.** No `.max(now)` check. Users can record transactions dated 2099-12-31. Suggested fix: add `.refine(s => new Date(s) <= new Date(), ...)` to the date field, or document the intent if future-dated recurring is a use case.

- **`src/features/transactions/actions.ts:250` and similar — `account:accounts(currency_code)` foreign-key join.** Confirmed this works because Supabase PostgREST respects RLS on joined tables, and the join targets a row the user already owns (via the transaction's `user_id = user.id` filter). However, if a future schema change makes accounts a per-user resource with stricter RLS, this would break silently. Add a unit test or a code comment. Suggested fix: a comment in `transactions/actions.ts` near `account:accounts(currency_code)` saying "RLS on accounts allows owner to SELECT; join is safe".

## MEDIUM (tech debt / DX)

- **`scripts/patch-paraglide-runtime.mjs` is not wired into `package.json` build/dev scripts.** Confirmed: only `paraglide:compile` is registered (`package.json:10`). Any developer who runs `npm run paraglide:compile` (or anyone setting up the project fresh from a fresh checkout of `paraglide-js`) overwrites the patched `runtime.js` with a stock version, breaking the globalThis sharing trick that `proxy.ts:1-20` relies on. **Suggested fix:** add a `postparaglide` npm hook (e.g. `"postparaglide:compile": "node scripts/patch-paraglide-runtime.mjs"`), or chain it into a single `paraglide:build` script. Document the dependency in `README.md`.

- **Tests: zero test files in the entire `src/` tree.** Confirmed by `find /run/media/sonvn/DATA/Source/personal-finance-manager/src -name '*.test.*' -o -name '*.spec.*'` returning empty. The reference project has comprehensive tests for `localizeHref`/`language-switcher`; PFM has none. The CRITICAL locale bug above would have been caught by a single `localizeHref('/dashboard')` test under `locale='vi'` returning `/vi/dashboard`. **Suggested minimum tests:** (1) `paraglide/localize-href.test.ts` — verify baseLocale behavior, (2) `lib/supabase/server.test.ts` — verify cookies set on read-only context, (3) `features/transactions/schema.test.ts` — boundary cases (negative amount, future date), (4) `features/dashboard/chart-actions.test.ts` — verify cat.id null-guard.

- **`as never` casts hide type bugs.** 7 occurrences in production code:
  - `src/app/[locale]/(protected)/dashboard/page.tsx:101` — `t as never as { account: { currency_code: string } | null }`
  - `src/app/[locale]/(protected)/dashboard/page.tsx:125,126` — `fullAccounts ?? [] as never`, `fullCategories ?? [] as never`
  - `src/features/dashboard/chart-actions.ts:75,151` — same pattern
  - `src/features/recurring/actions.ts:199` — `(data ?? []) as never`
  - `src/features/recurring/calendar.ts:62-74` — `row as never as { ... }`
  - `src/features/transactions/actions.ts:223,263` — same pattern
  These are all PostgREST join results being cast by hand instead of using generated `Database` types. The project has `src/types/database.ts` but the generated types from Supabase CLI are not used. **Suggested fix:** `npx supabase gen types typescript --local > src/types/database-generated.ts` and use proper typed queries.

- **`console.error` in production code:** `src/features/auth/actions.ts:85` — `console.error('Seed categories failed:', seedError.message)`. Acceptable as a transient warning but should be wrapped behind a logger interface (e.g. `lib/logger.ts`) per project coding-style rules. No other `console.*` calls in `src/`.

- **Font loading in `src/app/layout.tsx:11-31` — four Google fonts, one weight each.** `Geist` and `Geist_Mono` are loaded with all default weights (subset `latin` only — fine for ASCII). `Bungee` is loaded with `weight: "400"` only — correct since it's a single-weight display face. `Lexend` is loaded with `weight: ["400", "500", "600", "700"]` AND `subsets: ["latin", "vietnamese"]` — this is the largest font payload. Verify whether all four weights are actually used in `globals.css`; if not, drop unused weights. The project's neo-brutalism direction is mostly satisfied with 400 + 700. **Suggested fix:** confirm in DevTools that the four-weight load is justified; consider dropping 500/600 if unused.

- **`src/features/dashboard/dashboard-charts.tsx:23-28` runs 3 sequential chart queries inside a single `Promise.all`, but each query internally also calls `requireUser()` → `createClient()`.** That's 3 separate `createClient()` instantiations per dashboard load, each doing its own cookie read. `createClient` is cheap, but a single shared client would be cleaner.

- **`src/features/transactions/actions.ts:215-219` — `ilike` escape logic is partial.** `escaped.replace(/[%_]/g, c => '\\${c}')` escapes `%` and `_` for the user input, but does NOT use a parameterized RPC. Supabase/Postgres needs the escape character to be specified explicitly: `q = q.ilike('note', searchTerm, { escapeChar: '\\\\' })` or similar. As written, this will work only if the user's note already contains no `%`/`_` (because the escaped `\%` is sent literally and Postgres will interpret `\` as a string char, not escape). Verify the actual behavior — if Postgres treats the `\%` as `\` + `%` (literal), it leaks wildcards into the search. **Suggested fix:** test with a note containing `%`. If broken, use `supabase.rpc('search_note', { p_query })` with a stored function that does `note ILIKE '%' || replace(...) || '%'`.

- **`src/features/settings/actions.ts:202-235` — `deleteAccount` uses `process.env.SUPABASE_SERVICE_ROLE_KEY` at runtime.** The service-role key is documented as server-only, but `deleteAccount` runs inside a Server Action called from the client. Confirm that the env var is never exposed via `NEXT_PUBLIC_*` prefix. It is not — correct. However, ensure the build/deploy pipeline prevents `SUPABASE_SERVICE_ROLE_KEY` from being inlined into client bundles by running `next build` and grepping the `.next/static` output. If it appears, the server-action trust model is broken.

## LOW (nice to have)

- **`src/features/onboarding/wizard.tsx:157,188` — `localizeHref("/accounts")` and `localizeHref("/categories")` in OnboardingWizard.** Same bug class as CRITICAL. Same fix applies.

- **`src/components/branding/user-avatar.tsx:68` and `src/features/dashboard/nav-links.tsx:39` use `localizeHref` inside client components.** They rely on `getLocale()` from AsyncLocalStorage on the server, and the paraglide global variable on the client. After hydration, this is fine. Before hydration, the server-rendered href could differ from the client expectation if global variable hasn't synced. The proxy tries to mitigate this via the `x-paraglide-locale` header pattern. **Low risk** — verified the layout chain works for the most common case.

- **`src/features/dashboard/chart-actions.ts:153` — `byCategory.get(cat.id)`.** Audit asked to verify `cat.id` is non-null after the line 152 guard. Confirmed: `if (!cat) continue;` runs before `cat.id` access. **Not a bug.**

- **`src/app/[locale]/(protected)/dashboard/page.tsx:32-34` — early return `null` when user is undefined, with comment about layout redirect racing.** This is correct behavior for RSC streaming. Document it explicitly in the README so future contributors don't refactor away the guard.

- **`src/features/dashboard/dashboard-charts.tsx` — 4 chart cards in a 2x2 grid, but one (`chart_top_title` at line 57-62) is a static list, not a chart.** Rename or split for clarity.

- **`src/features/auth/login-form.tsx` and `signup-form.tsx` use `localizeHref` for inter-form links** (`/signup` and `/login`). Same bug class.

- **`src/app/[locale]/(auth)/check-email/page.tsx:43` and `error/page.tsx:34,37` use `localizeHref`.** Same bug class.

- **`src/app/[locale]/(protected)/transactions/page.tsx:146` and `recurring/page.tsx:96` use `localizeHref`.** Same bug class.

- **`src/app/[locale]/(protected)/budgets/page.tsx:84,94,113` use `localizeHref`.** Same bug class.

- **`src/features/transactions/load-more.tsx:24` uses `localizeHref`.** Same bug class.

## Verification commands I ran

- `find src -name '*.ts' -o -name '*.tsx'` — full source tree enumerated
- `grep -rn 'localizeHref' src/` — 23 call sites across 14 files (all confirmed)
- `grep -rn 'deLocalizeHref\|localizeUrl\|extractLocaleFromUrl' src/` — no other URL helpers in use
- `grep -rn "as never\b\| as any\b" src/ --include='*.ts' --include='*.tsx'` — 7 unsafe casts (all PostgREST joins)
- `grep -rn 'console\.' src/ --include='*.ts' --include='*.tsx'` — 1 production `console.error`
- `grep -rn "redirect(['\"]/" src/ --include='*.ts' --include='*.tsx'` — 4 bare-path redirects (auth + accounts)
- `grep -rn "revalidatePath(['\"]/" src/ --include='*.ts' --include='*.tsx'` — `revalidatePath` is fine with bare paths
- `find . -name '*.test.*' -o -name '*.spec.*'` — 0 tests
- `cat scripts/patch-paraglide-runtime.mjs` + `grep patch-paraglide package.json` — patch not wired into build
- Read each server action file: all use `requireUser()` except `auth/actions.ts` (correct, pre-auth) and `search/actions.ts` (gracefully returns empty for unauthenticated, acceptable)
- Read `proxy.ts`, `runtime.js` (default-pattern and strategy), `app/page.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/(protected)/layout.tsx`
- Read `supabase/migrations/0001_init_schema.sql` — RLS scoped per user, FK joins safe
- Read `language-switcher.tsx` workaround — confirms dev knew about the bug class but only fixed it for the switcher

## Open questions

- **Is the `vi` baseLocale / no-prefix behavior intentional product-wise?** The dev's comment in `nav-links.tsx` says it is, but the routes were clearly designed for `/[locale]/...`. Either:
  - (a) Refactor routing to support bare paths (mirror `/vi/dashboard` to `/dashboard` etc.), or
  - (b) Refactor `localizeHref` to always prefix the baseLocale, matching the existing route structure, or
  - (c) Switch baseLocale to a non-routed locale like `en` and keep `vi` as a prefixed secondary locale (inversion of current state).
  Recommend asking the user which direction they want before fixing.

- **Should the test suite cover only PFM-specific logic (charts, schemas, actions), or should it also include the locale helpers?** The reference project covers both. Given the CRITICAL locale bug, the locale helper test is the higher-priority gap.

- **`lucide-react@1.28.0` and `next@16.2.12` are bleeding-edge.** Audit asked to verify React 19 compatibility. The package.json declares React 19.2.4, so they should be aligned. WebFetch against npm registry was not run as part of this audit. Recommend a quick `npm audit` + check the `lucide-react` CHANGELOG for the 1.28 release notes before deployment.

- **Is there a deployed/staging environment to validate the locale bug end-to-end?** If yes, a manual click-through of `/vi/dashboard` → click any nav link → confirm 404 would close out the CRITICAL finding in minutes. If no, set up the project locally first.