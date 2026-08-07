# Phase 15 — Loading skeletons + empty states polish

**Status**: COMPLETED
**Started**: 2026-08-02 17:32
**Plan dir**: `plans/260802-1732-phase15-skeletons/`

## Goal

Polish perceived performance + UX:
- Skeleton primitives với shimmer animation (neo-brutalism style)
- Wire Suspense ở slow pages (dashboard charts) để streaming từng phần
- EmptyState component dùng chung + apply cho 3 list (category, budget, recurring)

## Approach

### 15.1 Skeleton primitives (DONE ở session trước)
- `src/components/ui/skeleton.tsx` — `<Skeleton>` với shimmer overlay
- `src/app/globals.css` — `@keyframes shimmer` + `.animate-shimmer`
- `src/components/ui/skeleton-presets.tsx` — `SkeletonCard`, `SkeletonTable`, `SkeletonStat`, `SkeletonList`

### 15.2 Suspense + empty states (DONE)
- `src/features/dashboard/dashboard-charts.tsx` — tách chart data fetch thành async RSC
- `src/app/(protected)/dashboard/page.tsx` — wrap `<DashboardCharts>` trong `<Suspense fallback=4 SkeletonCard>`
- `src/components/ui/empty-state.tsx` — EmptyState component (icon, title, description, optional CTA)
- Apply EmptyState vào 3 list: category-list, budget-list, recurring-list
- transaction-list giữ inline DOM vì có conditional `isFiltered` phức tạp
- account-list giữ inline DOM vì có inline `size-14` box khác biệt

### 15.3 Verify + report (DONE)
- Build pass

## Phases

| Step | File | Status |
|------|------|--------|
| 15.1 | Skeleton primitives + presets | DONE |
| 15.2 | Wire Suspense (dashboard) + empty states | DONE |
| 15.3 | Verify build + report | DONE |

## Acceptance criteria

- [x] Skeleton primitives với shimmer
- [x] Dashboard charts wrap trong Suspense với skeleton fallback
- [x] EmptyState component dùng chung
- [x] 3 list áp dụng EmptyState
- [x] Build pass

## Files

```
+ src/components/ui/skeleton.tsx
+ src/components/ui/skeleton-presets.tsx
+ src/components/ui/empty-state.tsx
+ src/features/dashboard/dashboard-charts.tsx
~ src/app/(protected)/dashboard/page.tsx
~ src/features/categories/category-list.tsx
~ src/features/budgets/budget-list.tsx
~ src/features/recurring/recurring-list.tsx
~ src/app/globals.css
+ plans/260802-1732-phase15-skeletons/plan.md
+ plans/260802-1732-phase15-skeletons/reports/phase15-skeletons-empty-states-build-pass.md
```

## Risks / Notes

- **Suspense streaming đã có sẵn trong Next.js 16 App Router**: chỉ cần wrap async child component trong `<Suspense>` là tự động stream phần đó ra sau khi parent render.
- **EmptyState component**: dùng inline DOM thay vì component ở 2 list còn lại (transaction, account) vì chúng có content conditional hoặc custom box style khác.
- **Shimmer animation**: 1.6s ease-in-out infinite, translateX(-100% → 100%), không phụ thuộc JS.
- **Suspense fallback layout**: 4 SkeletonCard trong grid 2-cols match đúng chart layout, không gây layout shift.

## Reports

- `reports/phase15-skeletons-empty-states-build-pass.md`
