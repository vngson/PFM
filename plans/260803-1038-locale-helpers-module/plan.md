---
title: Locale Helpers Module + Migration
date: 2026-08-03
type: implementation
status: pending
project: personal-finance-manager
mode: fast
brainstorm: plans/reports/brainstorm-260803-1038-locale-helpers-module-report.md
audit: plans/reports/general-purpose-260803-1039-pfm-audit-report.md
phases: 3
---

# Plan: Locale Helpers Module + Migration

## Status

`pending` — approved by brainstorm, ready for implementation.

## Problem

`localizeHref` từ paraglide v2 mặc định bỏ prefix cho `baseLocale` (vi). Project routes là `app/[locale]/*` — URL `/dashboard` không match → 404 cho Vietnamese user. 23 call sites / 14 files bị ảnh hưởng + 4 `redirect()` calls trong auth actions. Cùng với đó: 0 tests trong project.

## Solution

Tạo `src/lib/i18n/locale-path.ts` với `buildLocalizedHref` (luôn giữ prefix) + `isKnownLocale` type guard. Migrate tất cả 23 `localizeHref` calls + 4 `redirect()` calls. Setup vitest + 8 unit tests cho module.

## Reference

Reference pattern: `mirailand-service-marketplace/apps/web/src/shared/i18n/resolve-locale.ts`

## Phases

| Phase | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 1 | Module + Vitest Setup | P1 | — |
| 2 | Migrate localizeHref + redirect calls | P1 | phase 1 |
| 3 | Verify + Build | P1 | phase 2 |

## Acceptance Criteria

- [ ] `pnpm test` passes (8+ tests)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm build` succeeds
- [ ] Manual: VI user clicks link → `/vi/...` (not `/...`)
- [ ] Manual: Fresh login → `/vi/dashboard` (not `/dashboard`)
- [ ] No `localizeHref` left in app code (grep returns 0)

## Out of Scope (Group 2 — separate brainstorm)

- Dashboard dedupe fetches
- Transaction form validation
- Pre-compile patch hook
- Lucide-react v1→v0 migration
- Lexend weight 600 trim
- CVE-2026-64642 verification
- Replace `console.error` with logger
- 7 `as never` casts
- `ilike` escape bug
