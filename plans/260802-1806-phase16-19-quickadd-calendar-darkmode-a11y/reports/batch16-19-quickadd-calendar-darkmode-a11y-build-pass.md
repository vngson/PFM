# Batch 16-19 Report — Quick add + Calendar + Dark mode + A11y

**Date**: 2026-08-02 18:06
**Scope**: 4 phases (FAB, recurring calendar, dark mode, a11y)
**Outcome**: ✅ Build pass

## Deliverables

### Phase 16 — Quick add transaction (FAB)

- `src/features/transactions/quick-add-form.tsx` — mini dialog 3 fields (amount + category + account). Type toggle (expense/income). Reset khi mở. Auto-close + toast khi save thành công.
- `src/app/(protected)/layout.tsx` — fetch `accounts` + `categories` song song, pass cho QuickAddForm mounted ở root protected layout. FAB cố định góc phải-dưới, có trên mọi protected page.

### Phase 17 — Recurring calendar view

- `src/features/recurring/calendar.ts` — server helper `getRecurringOccurrences(month)` advance next_run_at cho đến hết tháng.
- `src/features/recurring/calendar-view.tsx` — client component grid 7 cols (T2-CN). Highlight today, ô out-of-month mờ. Hiển thị income/expense occurrences per day.
- `src/features/recurring/view-tabs.tsx` — toggle List ↔ Calendar với useTransition.
- `/recurring` page thêm tab mặc định = list, click "Lịch tháng" → calendar.

### Phase 18 — Dark mode toggle

- `src/components/theme/theme-provider.tsx` — wrap next-themes.
- `src/components/theme/theme-toggle.tsx` — 3-state cycle (Sun → Moon → Monitor). Mounted guard chống hydration mismatch.
- Root layout wrap ThemeProvider với `defaultTheme="system" enableSystem`.
- ThemeToggle wired vào header protected layout (giữa Search + Avatar).

### Phase 19 — Accessibility audit pass

- `src/components/a11y/skip-link.tsx` — sr-only link, focus thì hiện ở góc trên-trái.
- Root layout chèn SkipLink.
- Protected `main` có `id="main-content"` cho skip target.
- `globals.css` — `:focus-visible` outline 3px ring + offset 2px. `:focus:not(:focus-visible)` tắt outline cho mouse user.

## Type errors gặp & fix

| Phase | Lỗi | Nguyên nhân | Fix |
|-------|-----|-------------|-----|
| 16 | `useRef` not found | Quên import | Add `useRef` to react imports |
| 16 | `string \| null` not assignable to `string` | Select `onValueChange` typed nullable | Default to `''` khi null |
| 17 | None | — | — |
| 18 | None | — | — |
| 19 | None | — | — |

## Build verification

```
✓ Compiled successfully in 7.5s (16)
✓ Generating static pages (17/17)
✓ Compiled successfully (17-19)
```

## Decisions

- **FAB mounting ở layout (không phải page)**: User ở bất kỳ protected page đều có thể ghi nhanh. Trade-off: tăng payload initial 1 chút (accounts + categories) nhưng đã có sẵn data.
- **Calendar tab client-side, occurrences server-computed**: Server cần forward-seek recurring rules (next_run_at có thể đã quá khứ). Compute server-side rồi pass xuống client grid.
- **3-state theme (light/dark/system)**: Match macOS/iOS UX. User có thể chọn theo dõi OS preference.
- **Skip link + focus-visible ring**: Tier 1 a11y wins, 0 overhead. Bỏ qua axe-core setup (chưa có test framework).
- **Không đụng vào sonner**: Sonner đã có `useTheme` fallback từ document class. ThemeProvider wrap root → tự động works.

## Open questions

- **Theme persistence**: next-themes dùng localStorage `theme` key. Cần test qua reload xem có nhớ không.
- **Calendar next month pre-fetch**: Khi user click ">", hiện tại chỉ fetch pre-rendered tháng. Có cần dynamic fetch tháng khác không? Phase sau nếu user đòi.
- **FAB ở mọi page**: Có nên ẩn FAB ở `/recurring` (tab calendar) vì đang focus schedule? Chưa cần.
- **A11y deep audit**: aria-labels cho icon-only buttons (đã có phần lớn), role cho list dialog, color contrast check cho dark mode. Phase sau.

## Files modified/created

```
+ src/features/transactions/quick-add-form.tsx
+ src/features/recurring/calendar.ts
+ src/features/recurring/calendar-view.tsx
+ src/features/recurring/view-tabs.tsx
+ src/components/theme/theme-provider.tsx
+ src/components/theme/theme-toggle.tsx
+ src/components/a11y/skip-link.tsx
~ src/app/layout.tsx
~ src/app/(protected)/layout.tsx
~ src/app/(protected)/recurring/page.tsx
~ src/app/globals.css
+ plans/260802-1806-batch16-19/reports/batch16-19-quickadd-calendar-darkmode-a11y-build-pass.md
```
