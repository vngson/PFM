# Phase 12 — Transactions edit/delete polish

**Status**: COMPLETED
**Started**: 2026-08-02 18:09
**Plan dir**: `plans/260802-1809-phase12-txn-polish/`

## Goal

Sửa lỗi "Sửa" dropdown không mở form (button không wired). 
Trước: `<TransactionForm trigger="edit">` render ẩn trong `<div className="hidden">` → không bao giờ trigger được.
Sau: state lifting pattern giống categories — `editingId` ở list, render 1 form ở root với `key` + controlled `open`.

## Approach

- `TransactionForm`: thêm `trigger="hidden"` + controlled `open`/`onOpenChange`. Reset state khi edit form mở với transaction mới.
- `TransactionList`: state `editingId`, click "Sửa" trong dropdown → `setEditingId(row.id)`. Render `<TransactionForm key={id} trigger="hidden" open onOpenChange>` ở root với find row tương ứng.
- AlertDialog tách ra khỏi dropdown (bỏ `AlertDialogTrigger as DropdownMenuItem` hack) → render inline ở cuối row.

## Phases

| Step | File | Status |
|------|------|--------|
| 12.1 | Read current UI | DONE |
| 12.2 | Dropdown wired + form controlled | DONE |
| 12.3 | Verify build + report | DONE |

## Acceptance criteria

- [x] Click "Sửa" trong dropdown mở form với data của transaction
- [x] Click "Xoá" mở AlertDialog confirm
- [x] Form edit reset state khi đổi transaction (key remount)
- [x] AlertDialog không nested trong dropdown (clean DOM)
- [x] Build pass

## Files

```
~ src/features/transactions/transaction-form.tsx   # + trigger='hidden', open/onOpenChange, reset effect
~ src/features/transactions/transaction-list.tsx   # state lifting editId + root form
+ plans/260802-1809-phase12-txn-polish/plan.md
+ plans/260802-1809-phase12-txn-polish/reports/phase12-txn-polish-260802-1809-report.md
```

## Risks / Notes

- **AlertDialog tách khỏi DropdownMenu**: trước dùng `AlertDialogTrigger as DropdownMenuItem` hack → bug vì base-ui DropdownMenuItem close menu trước khi AlertDialog mở. Tách inline ở cuối row cleaner hơn.
- **Edit form root-level**: 1 instance duy nhất, key={id} reset state. Trade-off: nếu có 100 rows thì vẫn chỉ 1 form mounted → tốt cho perf.

## Reports

- `reports/phase12-txn-polish-260802-1809-report.md`
