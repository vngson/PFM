# Phase 15 Report — Skeleton + Empty States

**Date**: 2026-08-02 17:32
**Scope**: Loading skeletons + empty state polish
**Outcome**: ✅ Build pass

## Deliverables

### Skeleton primitives (15.1)

- `src/components/ui/skeleton.tsx` — `<Skeleton>` với shimmer overlay
  - Neo-brutalism: border-2 + bg-muted
  - `after:animate-shimmer` gradient chạy ngang
- `src/app/globals.css` — `@keyframes shimmer` 1.6s + `.animate-shimmer`
- `src/components/ui/skeleton-presets.tsx`:
  - `SkeletonCard` (header + body rows)
  - `SkeletonTable` (rows + cols grid)
  - `SkeletonStat` (số to + label)
  - `SkeletonList` (icon + 2-line item)

### Suspense + empty states (15.2)

- `src/features/dashboard/dashboard-charts.tsx` — tách chart data fetch thành async RSC
- `src/app/(protected)/dashboard/page.tsx`:
  - Stat cards fetch sync (header hiển thị ngay)
  - Charts wrap trong `<Suspense fallback={4 SkeletonCard}>`
  - Khi chart fetch xong sẽ stream vào, không block header
- `src/components/ui/empty-state.tsx` — reusable component:
  - Props: `icon`, `title`, `description`, `actionHref?`, `actionLabel?`, `action?`
  - Border-dashed + shadow-brutal-sm + icon box neo-brutalism
- Apply EmptyState vào 3 list:
  - `category-list.tsx` (Tag icon)
  - `budget-list.tsx` (Target icon)
  - `recurring-list.tsx` (Repeat icon)

### Giữ inline DOM

- `transaction-list.tsx` — empty state có conditional `isFiltered` + clearHref link
- `account-list.tsx` — empty state dùng inline size-14 box

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `Unused '@ts-expect-error' directive` | Next 16 + TS đã có async RSC typing built-in | Remove directive |

## Build verification

```
✓ Compiled successfully in 6.9s
✓ Generating static pages using 7 workers (17/17)
```

## Decisions

- **Tách chart thành async RSC**: Parent page fetch stat cards sync (LCP-friendly), chart fetch lazy trong Suspense boundary. Charts là phần nặng nhất (3 aggregation queries) nên đẩy xuống lazy stream.
- **EmptyState component**: 3 list dùng chung style. 2 list còn lại giữ inline vì có content đặc thù (transaction filtered state, account custom box).
- **Shimmer overlay**: dùng CSS `::after` + `animation` thay vì JS, không ảnh hưởng performance.
- **SkeletonCard cho dashboard fallback**: 4 cards match đúng chart grid 2-cols, không gây layout shift.

## Open questions

- Cải thiện thêm: empty state có CTA button? Hiện chỉ là text hướng dẫn. User phải tự bấm "Thêm X" ở header.
- Loading state cho buttons (save/delete)? Hiện có `pending` state nhưng chỉ disable.
- Optimistic update cho delete? Hiện vẫn đợi server confirm.

## Files modified/created

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
