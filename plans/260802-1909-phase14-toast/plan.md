# Phase 14 — Toast/notification system

**Status**: COMPLETED
**Started**: 2026-08-02 19:09
**Plan dir**: `plans/260802-1909-phase14-toast/`

## Goal

Replace native `alert()` với toast (sonner) cho consistent UX:
- Sonner đã có sẵn (`src/components/ui/sonner.tsx`) + `<Toaster>` đã wired ở root layout
- Tạo helper `lib/toast.ts` cho consistent messaging
- Apply cho tất cả list delete/archive/toggle/generate handlers

## Approach

- `lib/toast.ts`:
  - `notify.success/error/warning/info/loading/dismiss` — wrappers around `sonner`
  - `notifyActionResult(result)` — auto-detect success/error từ ActionState
  - `withToast(msg, promise)` — show loading toast, swap to success/error
- Replace `alert(...)` trong 5 files:
  - account-list.tsx (archive + delete)
  - category-list.tsx (delete)
  - budget-list.tsx (delete)
  - transaction-list.tsx (delete)
  - recurring-list.tsx (delete + toggle + generate)

## Phases

| Step | File | Status |
|------|------|--------|
| 14.1 | `lib/toast.ts` helpers | DONE |
| 14.2 | Replace alert() → notify trong 5 list files | DONE |
| 14.3 | Verify build + report | DONE |

## Acceptance criteria

- [x] Sonner `<Toaster>` đã wired ở root
- [x] Toast helpers (`notify.*`, `notifyActionResult`, `withToast`)
- [x] Tất cả `alert()` đã được thay bằng `notify.error()`
- [x] Mỗi delete/archive/toggle/generate có `notify.success()` khi thành công
- [x] Build pass

## Files

```
+ src/lib/toast.ts
~ src/features/accounts/account-list.tsx
~ src/features/categories/category-list.tsx
~ src/features/budgets/budget-list.tsx
~ src/features/transactions/transaction-list.tsx
~ src/features/recurring/recurring-list.tsx
+ plans/260802-1909-phase14-toast/plan.md
+ plans/260802-1909-phase14-toast/reports/phase14-toast-260802-1909-report.md
```

## Risks / Notes

- **next-themes chưa có provider**: sonner `useTheme()` sẽ fallback `system`. Vì project hiện chỉ có 1 theme (light) nên OK. Nếu sau này thêm dark mode thì cần wrap provider.
- **`<Toaster richColors position="top-center" />`**: position top-center dễ thấy, richColors giúp phân biệt success/error rõ.
- **Vietnamese messages**: tất cả messages tiếng Việt cho consistency.

## Reports

- `reports/phase14-toast-260802-1909-report.md`
