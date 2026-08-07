# Validation Review — PDPD Compliance Roadmap

**Plan**: `/run/media/sonvn/DATA/Source/personal-finance-manager/plans/260804-1445-pdpd-compliance/`
**Reviewer**: general-purpose (red-team)
**Date**: 2026-08-04

---

## 1. Whole-plan consistency

### PASS
- Dependency graph is internally consistent: 02 requires 01, 04 requires (02, 03), 05 requires 02 → valid topological order.
- Recommended build order `01 → 02 → 03 → 05 → 04` matches dependencies and minimizes blocked work.
- Brainstorm report's hardcoded 5-phase layout (A–E) is faithfully extended into this plan.
- `Total: 14 new + 6 modified + 3 migrations` in `plan.md` matches the file-scope inventory across phases.

### FAIL — Migration filename gap
- `supabase/migrations/` currently contains only `0001_init_schema.sql` and `0002_seed_default_categories.sql` (verified by `ls`).
- Plan proposes `0006_data_export_requests.sql`, `0007_soft_delete.sql`, `0008_consent_records.sql`. **Numbers 0003, 0004, 0005 do not exist.** Either:
  - Files 0003–0005 were planned elsewhere and now lost, or
  - The plan should renumber to 0003, 0004, 0005 to keep sequential ordering.
  - Brainstorm at line 144 explicitly references `0003_soft_delete.sql`, `0004_consent_records.sql`, `0005_purge_cron.sql` — but the plan split soft-delete (→0007) and consent (→0008). The number gap is **inconsistent with brainstorm** and with `0001/0002` on disk.
  - **Fix**: renumber all three plan migrations to `0003`, `0004`, `0005`. Update plan.md Risk row "3 migrations" consistency check after.

### FAIL — File-scope undercount
- `plan.md` says "**Total**: 14 new + 6 modified + 3 migrations". Counting across phases:
  - Phase 01: 8 new (4 md + 2 page + renderer + loader) + 2 modified (layout, package.json)
  - Phase 02: 0 new + 4 modified (schema, signup-form, actions, 2 messages)
  - Phase 03: 1 new migration + 1 new helper + 3 modified (actions, export-data-card, actions.ts counts once)
  - Phase 04: 1 new migration + 2 new pages + restore-action + 5 modified (middleware, auth actions, settings actions, settings card, messages)
  - Phase 05: 1 new migration + 1 new helper + 3 modified (auth actions, signup-form, env)
  - Realistic: ~14 new files, ~12 modified files, 3 migrations. The "6 modified" tally in `plan.md` is **wrong** (understates by 6).

### FAIL — Duplicate/conflicting actions.ts reference in Phase 03
- Phase 03 step 3 says "Modify `src/features/settings/actions.ts` (`exportAllData` rewrite)" (line 41) **and** line 41 lists `src/lib/export/payload-builder.ts` as a "Create" but earlier line 41 of `plan.md` does not list `payload-builder.ts` in the file scope ("Create: ... 1 helper" — vague).
- More importantly, Phase 03 also says the `useActionState` + `useActionState` pattern needs verifying against `signup-form.tsx` — but Phase 02 does the form, not Phase 03.
- The cross-references between Phase 03 test pattern (`useActionState` was not in the export flow) and existing `export-data-card.tsx` is misaligned — the export card uses `useTransition`, not `useActionState`. Phase 03 step 2 introduces `payload-builder.ts` as a Create but Phase 03 step 4 says "Update filename in `export-data-card.tsx`" — that file is not enumerated in plan.md's "Files scope".

---

## 2. Schema / RLS correctness (Phase 04)

### FAIL — RLS update only mentions `profiles_select_own`
- Phase 04 Migration 0007 only DROPs/CREATEs `profiles_select_own`. It then says "Tương tự cho accounts, categories, transactions, budgets, recurring_transactions" without enumerating the actual policy names.
- Verified against `/supabase/migrations/0001_init_schema.sql` (lines 167–242): **24 RLS policies exist** (`{table}_{select,insert,update,delete}_own`). Phase 04 needs to update **6 SELECT policies** and **6 UPDATE policies** (at minimum) to add `AND deleted_at IS NULL` on `profiles.deleted_at`. SELECT-only filtering is **insufficient**:
  - If only SELECT is filtered, a soft-deleted user can still `UPDATE` their own transactions (e.g. add new ones) because `update_own` policy does not check `deleted_at`. The user appears deleted in lists but can still mutate data.
  - Confirmed in `0001_init_schema.sql` lines 173–174: `profiles_update_own` lets any `auth.uid() = id` update; **the plan does NOT update this**.
- **Fix**: Phase 04 Migration 0007 must update `SELECT` AND `UPDATE` policies on all 6 tables:
  ```sql
  -- Recreate policies including `AND deleted_at IS NULL` on UPDATE USING + WITH CHECK
  -- to prevent mutations while soft-deleted.
  ```

### PASS — Storage trigger on `receipts` bucket
- `0001_init_schema.sql` line 324 creates bucket `('receipts', 'receipts', false)` with matching storage RLS using `(storage.foldername(name))[1]`. Phase 04 trigger `bucket_id = 'receipts' AND (storage.foldername(name))[1] = OLD.id::text` matches the existing pattern.

### QUESTION — Manual cron job setup
- Phase 04 includes pg_cron SQL as a commented-out `-- SELECT cron.schedule(...)`. The plan treats this as optional but the success criteria `criterion 6` says "Manual SQL test: xóa user quá 30 ngày → cascade tới 6 tables" — execution depends on cron being enabled in production Supabase.
- Confirmed: pg_cron is **not** in `0001_init_schema.sql` and there is no migration enabling it. The plan should explicitly state "Manual SQL setup required by operator in Supabase Dashboard before merge to prod".

### FAIL — DELETE flow breaks on RESTART before cron
- Phase 04 says `requestAccountDeletion` triggers signOut + redirect immediately after marking `deleted_at`. But the *next signIn* in the 30-day window will pass auth (Supabase Auth does not check `profiles.deleted_at`) and only get redirected by middleware → `/account-deleted`. Plan covers this in step 3 of Implementation Steps but does NOT cover this edge case:
  - **What if user is mid-flow (e.g. between signOut and middleware hit) and someone reads their data from a cached page?** Session cookie is cleared by `signOut()` so RLS will reject on the next request — but in-memory React state may still show data for ~one render. Acceptable but undocumented.
  - More importantly: **what if user signs up a new account from the same email after soft-deleting the old one?** Plan does not address `profiles.id` collision; `profiles` PK is `references auth.users(id)` so a new auth.users row gets a new UUID — no collision. **PASS** on this sub-question.

### FAIL — RLS still allows user to update `profiles` even after delete
- Phase 04 says "RLS hide data đã xóa" but only updates SELECT. If a soft-deleted user navigates back from `/account-deleted` without clicking restore, they have a stale session and could patch their own settings (`updateProfile` in `src/features/settings/actions.ts` lines 49–88). The `profiles` UPDATE policy allows it. Confirmed via `0001_init_schema.sql` lines 173–174.
- **Fix**: add `AND deleted_at IS NULL` to `profiles_update_own` USING + WITH CHECK clauses too. Plan currently misses this.

---

## 3. Phase 03 edge cases

### PASS — 5MB limit is generous
- Phase 03 step 1 says `MAX_EXPORT_BYTES = 5MB` (5×1024×1024 ≈ 5,242,880 bytes). At ~200 bytes JSON per transaction row, this supports ~25,000 transactions — easily covering a year of personal use. LIMIT_BYTES comment is honest about being a "leak guard".

### FAIL — Rate limit logic only counts `>= 1` in last hour
- Phase 03 step 3 (`exportAllData` rewrite): the rate-limit check uses `gte('requested_at', oneHourAgo)` and counts existing audit rows. But:
  - Every successful export **inserts** a row first → the audit row for *this* export is not yet inserted at check time → check passes → insertion happens → next call within the hour sees the previous one and rejects. Correct.
  - But Phase 03 says `count recent exports` while `recentCount` includes **both success and failed**. Failed exports also count. Plan addresses this in the Risk row "Count cả success + failed" — but this risks user-locking if server has a transient failure.
  - More importantly: rate limit is **in-process via server-action DB query**, so clock skew between client and server is irrelevant (server reads its own `now()`). The plan's question "What about clock skew" answers itself with the design.

### FAIL — clock skew question (raised in checklist)
- The plan assumes server-side time. There is no client clock in the rate-limit logic; server uses Supabase `now()` via `requested_at` column. **This is correct.** The validation checklist item is misframed — no fix needed.

### FAIL — `byte_size` field not in `ExportPayload` interface
- `src/features/settings/actions.ts` line 165–173 declares:
  ```ts
  export interface ExportPayload {
    exported_at: string;
    profile: unknown;
    accounts: unknown[];
    ...
    budgets: unknown[];
  }
  ```
- Phase 03 adds `byte_size` field via `as` cast on line 92 of phase doc: `(payload as ExportPayload & { byte_size: number }).byte_size = bytes`. This **mutates** the local variable (acceptable inside the helper) but creates a return type mismatch:
  - The helper `buildExportPayload` returns `ExportPayload` (no byte_size), but Phase 03 step 3 inserts the byte_size into `data_export_requests` from `(payload as { byte_size: number }).byte_size`. This works because the mutation happens.
  - **However**: line 92 of helper violates the project's common rule `WRONG: modify(original, field, value) → changes original in-place` — but since this is a locally-constructed `payload` object, mutation is acceptable. (Phase 03 risk #3 acknowledges: "Update ExportPayload interface in actions.ts". This is correct in spirit but the interface does not need updating for the *server-side* logic; it only matters if the client expects byte_size in the returned JSON. The plan should explicitly state "byte_size is server-side metadata, not part of user-facing payload.")
- **Fix**: Either
  - (a) Update `ExportPayload` interface to include `byte_size?: number` and serialize it into the user-facing payload, OR
  - (b) Compute byte_size locally in the server action, do not put it in the payload — clean and the audit row gets the value from the local variable.

### FAIL — `app_version` source undefined
- Phase 03 step 2 says `export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'`.
- Verified: there is **no** `NEXT_PUBLIC_APP_VERSION` env var in `.env.example` or `.env`. Phase 03 will silently fall back to `'0.1.0'` hardcoded string, making the payload `app_version` meaningless.
- **Fix**: Either wire up `NEXT_PUBLIC_APP_VERSION` in `.env.example` + `.env` (with README note about bumping per release) OR drop `app_version` from the payload entirely.

### FAIL — `data_export_requests` table is not in TS types
- `src/types/` exists (empty dir from `ls`). Plan does not create a TypeScript model for the new table. `supabase gen types` is not mentioned. The auth/settings actions will get `any`-typed return values from `.from('data_export_requests').insert(...)`. Although functional, this conflicts with `typescript/coding-style.md`'s "Avoid `any`".

---

## 4. Phase 02 schema detail

### PASS — `z.literal('on')` is the correct pattern
- Phase 02 step 1: `consent: z.literal('on', ...)` matches HTML checkbox `value="on"` when checked, and the field is absent when unchecked. FormData will have `consent: 'on'` or no `consent` key.

### FAIL — DevTools bypass not formally defended
- Plan checklist question: "But what if a user submits via DevTools with `consent=false`?" — Phase 02 does not address this. `z.literal('on')` rejects anything other than the literal string `'on'`, so `consent=false`, `consent="true"`, `consent=""` all fail Zod validation. **This is correct behavior** but the plan's risk row says "HTML checkbox submit value là `'on'` (khi checked) hoặc không có field (khi unchecked). Default browser behavior OK." — the plan does not explicitly say the server-side check rejects `'false'` / `'true'` / etc. The implementation will work, but the plan's documented "Defense in depth" is implicit.
- **Documentation fix**: add a test case `it('rejects consent=false', () => { ... })` — Phase 02 test 1 only covers `consent: 'true'` (line 136) and missing consent. Add explicit `consent: 'false'`, `consent: ''` cases.

### PASS — Factory pattern matches existing code
- `src/features/auth/schema.ts` lines 15–17: `signupSchema = (t: AuthMessages) => z.object({...})`. Phase 02 step 1 fits: `consent: z.literal('on', { message: t.consent_required() })`. The `t.consent_required` accessor must be added to `AuthMessages` interface (line 5–13) but Phase 02 step 2 says "Thêm messages cho paraglide" without explicitly reminding to extend the `AuthMessages` interface — risk of stale type.
- **Fix**: Phase 02 step 1 should explicitly say: "Extend `AuthMessages` interface in `schema.ts` to include `consent_required: () => string`".

### FAIL — `signupAction` wraps in `z.object({ username, email, password })` not parsed object
- Phase 02 step 4 says `signupAction` already uses `signupSchema(...)`, and Phase 02 risk row says "Server action tự động xử lý qua zod — không cần modify code".
- But: Phase 02 step 2 schema update requires adding `consent` to the schema. The schema currently parses `{ username, email, password }` (actions.ts line 36–40), so it will silently DROP the `consent` value with `safeParse`. The server action must be modified to pass `consent: formData.get('consent')` into the parse call.
- **Fix**: Phase 02 step 4 must explicitly modify `signupAction` to include `consent: formData.get('consent')` in the parsed object. The plan's "không cần modify code" line is wrong.

### FAIL — `signupAction` already imports `signupSchema` which does not validate consent
- Confirmed: `src/features/auth/actions.ts` line 28–40 calls `signupSchema({...})` with **7 message keys** (no `consent_required`). When Phase 02 adds `consent` to the schema with `t.consent_required()`, the `signupAction` MUST also pass `consent_required: m.zod_consent_required` (or similar) to the factory. The plan does not specify which message key.
- **Fix**: explicitly add `consent_required: m.zod_consent_required` to `signupSchema({...})` call in step 1 of Implementation Steps, and add new key `zod_consent_required` to messages/{vi,en}.json (Phase 02 step 2 lists it as `auth_consent_*` family but does not list `zod_consent_required`).

### FAIL — `consent: z.literal('on')` error path returns string, not paraglide function
- `z.literal('on', { message: t.consent_required() })` — the `message` option expects a string, but `t.consent_required()` returns `string` (per the AuthMessages type). Actually `z.literal` accepts `message: string | Error` so this is fine.
- BUT: per `signup-form.tsx` line 31–32, `fieldError('consent')` reads from `state?.fieldErrors?.['consent']?.[0]`. The action returns `{ fieldErrors: parsed.error.flatten().fieldErrors }` (line 43). The `signupAction` already returns fieldErrors correctly. **PASS** here.

---

## 5. Phase 05 secrets

### PASS — `SUPABASE_SERVICE_ROLE_KEY` is declared
- Verified `.env.example` line 5: `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`. `.env` line 7 also has it populated.

### FAIL — Phase 05 step 5 says "Thêm env check" but `src/lib/env.ts` does not exist
- Plan phase 05 step 5 references `src/lib/env.ts` — **this file does not exist** (verified via `find`).
- Confirmed via `find -maxdepth 5 -name "env.ts" -type f`: no results.
- The plan introduces a new `src/lib/env.ts` without flagging it as a **new file**, conflating "Modify" with "Create". `plan.md` line 43 lists 6 modified files but does not list this new env.ts.
- **Fix**: Update plan.md file scope to include `Create: src/lib/env.ts`.

### FAIL — Admin client behavior in dev if `SUPABASE_SERVICE_ROLE_KEY` missing
- Phase 05 step 5: `if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') { throw new Error(...) }` — i.e., only throws in production. In dev, the value can be missing and the app doesn't crash. But `createAdminClient` (step 4) does `createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, ...)` — passing `undefined` will cause Supabase to fail at first API call (not at construction). No graceful fallback.
- **Fix**: Either throw at startup if missing in any env, OR add an explicit runtime guard at the start of `signupAction` ("If env var missing, return friendly error to user, do not insert null key into client").

### FAIL — Privacy concerns with creating admin client per call
- Phase 05 step 4 defines `createAdminClient` as a singleton-creator (factory). The plan calls it inside `signupAction`. This is acceptable since it's `'use server'`-marked. But:
  - The factory is **defined in `src/lib/supabase/admin.ts`** without a `'use server'` directive at the top of the file. If anything in the client bundle accidentally imports the file (e.g. type imports with `verbatimModuleSyntax`), the admin client constructor runs in the browser.
  - **Mitigation already in plan**: "createAdminClient chỉ import trong server action files (marked 'use server')" — but admin.ts itself is NOT marked `'use server'`. The plan should add `'use server'` to the top of `admin.ts`.
- **Fix**: add `import 'server-only';` (already a Next.js convention) or `'use server';` at top of `src/lib/supabase/admin.ts`.

---

## 6. Phase 01 rendering

### FAIL — `marked` is not in dependencies and would need install
- Phase 01 step 1 says `pnpm add marked` and `pnpm add -D @types/marked`.
- Verified `package.json` (lines 13–35): `marked` is **not** present. Plan correctly identifies this as a step but `plan.md` line 42 lists "1 helper" as new — does not count the new dependency. Acceptable, but plan should mention verifying the `marked` package version compatibility with Next.js 16 (which is bleeding edge; some `marked@13.x` features require Node 18+).
- **Fix**: add note: "Verify `marked` version supports ESM (Next.js 16 default)".

### PASS — Server-side markdown + `dangerouslySetInnerHTML` is acceptable
- `src/components/legal/markdown-renderer.tsx` in Phase 01 step 3 uses `dangerouslySetInnerHTML` to render `marked.parse(content)`.
- Plan correctly notes "Content do dev viết, không từ user" (file-system-only). For developer-controlled input, no XSS concern. README content lives in `messages/` directory, only writable by repo maintainers. `dangerouslySetInnerHTML` is acceptable here.
- However: the ecre patterns mention that `dangerouslySetInnerHTML` should always be flagged in code review. Plan should call out this is an exception, not a pattern.

### FAIL — `messages/privacy/*.md` directory location inconsistent with project layout
- Verified: project has `messages/{vi,en}.json` at the **repo root** (`/run/media/sonvn/DATA/Source/personal-finance-manager/messages/`).
- Phase 01 architecture diagram (line 30) and step 2 code (line 75) say `path.join(process.cwd(), 'messages', file)` — which is correct because `messages/` is at repo root.
- BUT the file names `messages/privacy/vi.md` would create a nested structure `messages/privacy/{vi,en}.md` *alongside* `messages/{vi,en}.json`. This mixes paraglide message files (`.json`) with markdown content (`.md`) in the same `messages/` directory.
  - The project uses `messages/{vi,en}.json` as paraglide input. Adding `messages/privacy/vi.md` and `messages/terms/vi.md` is fine but plan should explicitly say "We DO mix file types in `messages/`. Confirm OK."
  - Alternative: use `content/{legal,privacy,terms}/{vi,en}.md` to keep markdown separate.
- **Fix**: Plan should clarify the layout is intentional, or move to `content/`.

### PASS — Server component + readFile pattern
- Phase 01 step 2 reads file via `node:fs/promises` in server component (page.tsx is server-rendered). Works in Next.js 16.
- However: in production with Edge runtime / serverless, file system access is sometimes restricted. Next.js 16 default runtime is Node.js; verify the deployment target uses Node runtime.

### QUESTION — Markdown content length / SEO
- Phase 01 step 5 says each MD file is "~150-300 dòng". That is significant content. Acceptance criteria requires "Nội dung cover đủ các mục PDPD yêu cầu". Plan does not outline the exact legal sections to be covered. This is delegated to "User finalize" (line 211) — acceptable for round 1 but risks legal review.

### PASS — Tailwind classes + heading hierarchy
- Phase 01 step 2 uses `prose prose-stone max-w-none` (typography plugin). Project uses `tw-animate-css`, `@tailwindcss/postcss`, tailwind v4. The `prose` plugin is part of `@tailwindcss/typography`, which is **not** in `package.json` dependencies.
- **Fix**: Plan should add `pnpm add -D @tailwindcss/typography` step alongside `pnpm add marked`.

---

## 7. General cross-cutting

### FAIL — Out-of-order execution risk
- **Phase 03 says no dependency** (plan.md line 28). But Phase 03 step 3 modifies `exportAllData` in `src/features/settings/actions.ts`. Phase 04 also modifies the same file. If devs execute 03 standalone, then later execute 04 without re-reading, there is a conflict risk on the same file.
- Phase 04 also modifies `src/features/auth/actions.ts`. Phase 05 also modifies the same file. Same risk.
- **Fix**: Plan should explicitly call out these shared-file dependencies in each phase's "Files to modify" list with a "merge conflict risk" annotation.

### FAIL — No rollback procedure for failed migrations
- Phase 04 + Phase 05 each create migrations. Plan lacks rollback scripts.
- For Phase 04 (adds `deleted_at` columns), rollback is `ALTER TABLE public.profiles DROP COLUMN deleted_at, scheduled_purge_at;`.
- For Phase 04 (RLS update), rollback is reverting each DROP POLICY + CREATE POLICY.
- For Phase 04 (trigger), rollback is `DROP TRIGGER before_delete_user_storage ON auth.users; DROP FUNCTION public.purge_user_storage();`.
- For Phase 03 (data_export_requests table), rollback is `DROP TABLE public.data_export_requests;` (with `DROP POLICY` first).
- For Phase 05 (consent_records), rollback is `DROP TABLE public.consent_records;`.
- **Fix**: Each phase should include "Rollback" subsection with explicit SQL.

### FAIL — Phase 05 schema uses `consent_type` enum only for hardcoded list
- Phase 05 step 1: `consent_type text not null check (consent_type in ('terms_and_privacy', 'marketing_emails', 'analytics_tracking'))`.
- Plan's out-of-scope says "Marketing email consent (chưa có tính năng email)" and "Analytics tracking consent (không dùng analytics tool)". So the CHECK includes two consent types that will never be used.
- **YAGNI violation**: include only `('terms_and_privacy')` and add new types when needed. Or use a more flexible enum + lookup table. Decide during impl.
- **Fix**: drop unused consent_type values.

### PASS — Soft-delete timing literal vs DB cast
- Phase 04 step 2: `scheduled_purge_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()` — OK. JS Date correctly produces ISO format consumable by Postgres `timestamptz`.

### FAIL — Phase 04 restore flow race condition (documented but unresolved)
- Phase 04 risk row line 274: "User click 'Khôi phục' nhưng data thực sự đã bị xóa (cron chạy trước)" — labeled "Mitigation: Cron check strictly...".
- But the cron is in Supabase, and the restore is via supabase client. **Race**: if cron runs at 1:59 AM daily and user logs in at 2:01 AM (after purge window), `scheduled_purge_at < now()` is true, account is purged. But auth.users has been deleted; user can't even login. **This race resolves to "user cannot restore"** — but the plan doesn't address what user sees when they try to login after purge. Plan should add "If user tries to login after purge, Supabase auth.signInWithPassword returns 'Invalid login credentials'" — so the user is silently locked out.
- **Fix**: Document the post-purge user experience in Phase 04 (out of scope: "User who tries to login after purge sees generic auth error" — acceptable).

### FAIL — Phase 05 silent failure for consent insert
- Phase 05 step 3: if `consentError`, the action does NOT block signup but only logs. The plan acknowledges this but no SLA nor alert is defined.
- **More important**: there's no mention of `console.error` being a violation per `common/coding-style.md` ("Use proper logging libraries instead. See hooks for automatic detection"). The plan should specify the logger being used (Sentry is mentioned only in passing).

### FAIL — Tests are partially under-specified
- Phase 04 test 1 ("middleware redirects soft-deleted user") is only manual. No unit test exists for the middleware redirect logic in `src/lib/supabase/middleware.ts`. Given the plan calls out this as the critical PDPD requirement, it should have automated coverage.
- Phase 05 test 3 ("unique constraint") is only manual. Given the constraint is a key safety guarantee, this should be automated (e.g., `expect(insert).rejects.toThrow('23505')`).
- Phase 03 test 2 ("rate limit logic") is manual. The 1-hour check is a critical anti-abuse guard — should be at minimum a unit test of the rate-limit function with mocked `now()`.
- **Fix**: upgrade Phase 03 test 2, Phase 04 test 1, Phase 05 test 3 from "Manual" to vitest unit tests.

### FAIL — `requestAccountDeletion` has no email re-confirmation
- Phase 04 step 2: `requestAccountDeletion` directly updates `profiles` without asking user to reconfirm email. Existing `delete-account-card.tsx` (verified) has email confirmation as a separate UI step (lines 46–60).
- The plan should specify: "Re-use existing `DeleteAccountCard` UI; only the action body changes" — currently it says "Update UX message" but does not say "Remove the email confirmation field, OR keep it but bypass validation".
- **Fix**: Phase 04 step 5 should explicitly preserve the email-confirmation step (UX safety); the soft-delete is a stronger commitment than hard-delete was, so the same friction applies.

---

## Summary of required fixes (prioritized)

### Critical (blocks correctness)

1. **Phase 04 RLS UPDATE policies missing** — only SELECT is updated. Add `AND deleted_at IS NULL` to UPDATE USING + WITH CHECK on all 6 tables to prevent soft-deleted users mutating data.
2. **Phase 04 middleware redirect runs in `src/proxy.ts`, not `src/lib/supabase/middleware.ts`** — plan targets the wrong file. The root proxy file is the entry point (verified, line 22-26 of proxy.ts).
3. **Phase 02 schema + signupAction parity** — Plan says "không cần modify code" for actions.ts but `signupAction` MUST be updated to pass `consent: formData.get('consent')` AND `consent_required: m.zod_consent_required` to the schema factory.
4. **Phase 02 AuthMessages type extension** — add `consent_required: () => string` to `AuthMessages` interface in `schema.ts`.
5. **Phase 05 `src/lib/supabase/admin.ts` lacks server-only guard** — Add `import 'server-only'` or `'use server'` to top of file to prevent client bundle inclusion.
6. **Phase 05 env validation file `src/lib/env.ts` does not exist** — Plan must Create it (not Modify) and update `plan.md` file scope.
7. **Phase 03 `byte_size` interface mismatch** — Either update `ExportPayload` interface or compute byte_size outside the payload.

### Major (security/deploy risk)

8. **Phase 04 cascade purge race** — Document post-purge user experience (silent auth fail).
9. **Phase 03 `app_version` undefined env var** — Either wire `NEXT_PUBLIC_APP_VERSION` into `.env.example` or drop `app_version` from payload.
10. **Phase 03 `data_export_requests` not in TS types** — Add `supabase gen types` step to plan.
11. **Phase 04 rollback procedures absent** — Add explicit SQL rollback per migration.
12. **Phase 05 consent_types includes unused values** — YAGNI; trim to `'terms_and_privacy'` only.

### Minor (clarity / idiomatic)

13. **Migration filename gap** — Renumber to `0003/0004/0005` or document why 6/7/8.
14. **Phase 01 `messages/` directory convention** — Either accept mixed file types or move to `content/`.
15. **Phase 01 `@tailwindcss/typography` missing** — Add explicit dependency install step.
16. **`plan.md` file scope tally wrong** — Re-count after fix #1 above; actual: 14 new + 12 modified + 3 migrations.
17. **Phase 02 test missing DevTools bypass cases** — Add `consent: 'false'` and `consent: ''` tests.
18. **Phase 04 delete-account-card.tsx not in modify list of phase 04** — Listed as "Modify" but no behavioral spec.
19. **Phase 04 retains email-confirmation?** — Explicitly say "preserve existing UI".
20. **Phase 04 manual cron enablement step** — Add as explicit operator task in success criteria.
21. **Test under-specification for Phases 03/04/05** — Upgrade critical tests to vitest unit tests.
22. **Phase 03 rate-limit includes failed rows** — Acknowledge as design choice; consider separate audit table.

---

## Open Questions Requiring User Clarification

1. **Soft-delete RLS strategy**: should it be `deleted_at IS NULL` on ALL operations (UPDATE/INSERT/DELETE) — locking the user fully — or SELECT-only, allowing the soft-deleted user to still update their profile? Brainstorm implies "full lockout" but Phase 04 only implements SELECT. **Decision**: full-lockout or select-only?
2. **`messages/` directory contents**: keep mixing `.json` and `.md` files, or split markdown to `content/`? **Decision**: layout choice.
3. **`@tailwindcss/typography`** is not present — is `prose` styling needed for legal docs, or should we hand-write typography? **Decision**: dep add or skip.
4. **Phase 04 cleanup safety**: does removing the `delete-account-card.tsx` email-confirmation step weaken account deletion safety, or is it acceptable for soft-delete (since it's reversible)? **Decision**: keep email-confirm or simplify.
5. **Phase 05 audit-trail completeness**: Phase 05 only logs Phase 02 consent. Should the Phase 04 sign-in attempt by soft-deleted user also create an audit row? **Decision**: scope expansion or not.
6. **`next.js 16`'s default file `proxy.ts`** instead of `middleware.ts` means Phase 04's "Modify middleware.ts" instruction is wrong. The plan should target `src/proxy.ts`. **Confirmation**: that the redirect lives in proxy.ts is correct.

---

## Conclusion

The plan is **directionally sound** and addresses PDPD's core gaps (privacy pages, consent, export, deletion, audit). However it has **7 critical correctness issues** (mostly RLS completeness, file targeting, and interface mismatches), **5 security/deploy risks** (env vars, server-only guards, rollback), and **10+ minor issues** (filename numbering, type imports, test coverage).

Recommend: rewrite Phase 04 (RLS completeness + file targeting), Phase 02 (action-level schema parity), Phase 05 (server-only admin client + env file creation). After fixes, the plan should be implementable in the recommended `01 → 02 → 03 → 05 → 04` order.
