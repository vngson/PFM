---
phase: 3
title: "Verify + Build"
status: pending
priority: P1
dependencies: [2]
---

# Phase 3: Verify + Build

## Overview

Final verification: tests pass, TS clean, production build succeeds, manual smoke tests pass. Document and report.

## Requirements

- Functional: all checks green
- Non-functional: no regression introduced

## Related Code Files

- Read: `tsconfig.tsbuildinfo` (final tsc output)
- Read: `.next/build-manifest.json` (final build output)

## Implementation Steps

### 1. Run full check chain

```bash
cd /run/media/sonvn/DATA/Source/personal-finance-manager
pnpm test
npx tsc --noEmit
pnpm build
```

All 3 must succeed.

### 2. Manual smoke tests

Two scenarios:

**Scenario A — Vietnamese user (baseLocale)**:
1. Open `http://localhost:3456/vi/dashboard` (logged in)
2. Click "Tài khoản" nav link → land `/vi/accounts` (not `/accounts`)
3. Click "Giao dịch" → land `/vi/transactions`
4. Open browser Network tab, verify request URLs all have `/vi/` prefix

**Scenario B — Fresh signup flow**:
1. Open `http://localhost:3456/vi/signup`
2. Submit form → redirect to `/vi/check-email` (not `/check-email`)
3. Click email link → land `/vi/dashboard` (not `/dashboard`)

If both pass, manual verification done.

### 3. Update CHANGELOG / docs

If project has `docs/project-changelog.md` hoặc `docs/development-roadmap.md`, append entry:
> Locale helpers module: 23 `localizeHref` + 4 `redirect()` calls migrated to `src/lib/i18n/locale-path.ts`. Fix Vietnamese user 404 on internal nav.

### 4. Write report

Save to `plans/reports/`:

```bash
# Manual — write a short report with:
# - Summary of changes
# - Test counts
# - Manual verification results
# - Any rollback notes
```

## Success Criteria

- [ ] `pnpm test`: all 8+ tests pass
- [ ] `npx tsc --noEmit`: clean
- [ ] `pnpm build`: succeeds
- [ ] Manual scenario A: VI nav links land `/vi/...`
- [ ] Manual scenario B: signup flow lands `/vi/...`
- [ ] `grep -rn 'localizeHref' src/` returns 0
- [ ] Doc updated if existing

## Risk Assessment

- **Low**: Production build có thể catch lỗi runtime không có trong dev. Mit: run `pnpm build` (executes `next build` với typecheck + lint).
- **Low**: Manual test depends on user being able to login. Mit: dev server already running, account exists.

## Rollback

If regression:

```bash
cd /run/media/sonvn/DATA/Source/personal-finance-manager
git checkout src/components/i18n/language-switcher.tsx  # restore pre-fix state
# Manually revert each migrated file via git
git diff src/ | grep '^+' | grep localizeHref  # find remaining refs
```

All 3 phase files are self-contained; revert is per-file.
