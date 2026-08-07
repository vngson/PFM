# Phase 14 Report — Toast/notification system

**Date**: 2026-08-02 19:09
**Scope**: Replace alert() với sonner toasts
**Outcome**: ✅ Build pass

## Deliverables

### Toast helper

`src/lib/toast.ts`:
- `notify.{success,error,warning,info,loading,dismiss}` — thin wrappers around `sonner`.
- `notifyActionResult(result)` — auto-detect success/error từ ActionState shape (`{ error?, success?, fieldErrors? }`).
- `withToast(msg, promise)` — fire-and-track promise với loading → success/error toast.

### Replace alert()

5 files updated:
- `account-list.tsx`: archive + delete → notify.success + notify.error.
- `category-list.tsx`: delete → notify.
- `budget-list.tsx`: delete → notify.
- `transaction-list.tsx`: delete → notify.
- `recurring-list.tsx`: delete + toggle (bật/tắt) + generate → notify.

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `toast.promise(...) as Promise<T>` | sonner return type có `unwrap()` overload khác Promise | Return `promise` trực tiếp thay vì cast |

## Build verification

```
✓ Compiled successfully in 7.2s
✓ Generating static pages (16/16)
```

## Decisions

- **Vietnamese messages**: consistent UX với UI còn lại (vd: "Đã xoá tài khoản.", "Lỗi khi xoá").
- **Toast success sau action thành công**: feedback tức thì, không cần reload để biết kết quả.
- **notifyActionResult** tiện cho form actions vì ActionState đã có error/success. Phase sau có thể apply cho useActionState (ProfileForm, PasswordForm) khi cần.
- **Không wrap Form submit** với toast vì đã có inline Alert trong form. Toast chỉ cho list actions (delete/archive/toggle).

## Open questions

- Toast cho create/update form? Hiện form tự redirect/revalidate. Có thể thêm success toast khi save.
- Undo toast cho delete? (vd: "Đã xoá. [Hoàn tác] trong 5s"). Phase sau nếu user đòi.
- Toast khi sync offline → online? Phase sau nếu cần PWA.

## Files modified/created

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
