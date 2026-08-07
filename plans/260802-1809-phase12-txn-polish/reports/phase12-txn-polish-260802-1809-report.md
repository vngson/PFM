# Phase 12 Report — Transactions edit/delete polish

**Date**: 2026-08-02 18:09
**Scope**: Wire Sửa dropdown + clean DOM nesting
**Outcome**: ✅ Build pass

## Deliverables

### TransactionForm

- Thêm `trigger?: 'create' | 'edit' | 'hidden'` (default 'create').
- Thêm controlled `open` + `onOpenChange`.
- `useEffect` reset type/accountId/categoryId khi `open && transaction` để form edit luôn sync với transaction hiện tại (parent dùng `key` để remount, nhưng có fallback).
- Render `DialogTrigger` chỉ khi `trigger !== 'hidden'`.

### TransactionList

- Thêm `editingId` state.
- Click "Sửa" trong dropdown → `setEditingId(row.id)`.
- Click "Xoá" → `setDeleteId(row.id)`.
- Render `<TransactionForm key={id} trigger="hidden" open onOpenChange>` ở root, lookup row từ `transactions.find`.
- AlertDialog tách ra khỏi dropdown menu → render inline ở cuối row cell. Bỏ `AlertDialogTrigger as DropdownMenuItem` hack.

## Bug fixes

| Bug | Nguyên nhân | Fix |
|-----|-------------|-----|
| Click "Sửa" không mở form | Form render ẩn trong `<div hidden>`, không có trigger | State lifting + key remount + controlled open |
| AlertDialog mở/đóng lỗi khi click trong dropdown | base-ui DropdownMenuItem auto-close menu trước khi AlertDialog portal mở | Tách AlertDialog ra khỏi dropdown, render inline |

## Build verification

```
✓ Compiled successfully in 7.6s
✓ Generating static pages (16/16)
```

## Decisions

- **State lifting edit form** thay vì render mỗi row: 1 instance duy nhất → perf tốt hơn, DOM gọn hơn. Key-based remount đảm bảo clean state khi đổi transaction.
- **AlertDialog tách dropdown**: clean DOM, không có nested portal. UX mượt hơn vì menu đóng + dialog mở là 2 action riêng biệt.
- **Click "Sửa" chỉ set state**: dropdown auto-close, root form tự mở. Không cần dispatchEvent hack.

## Open questions

- Inline edit (click row → expand editor)? Phase sau nếu cần.
- Bulk delete (multi-select + delete)? Phase sau nếu cần.

## Files modified

```
~ src/features/transactions/transaction-form.tsx
~ src/features/transactions/transaction-list.tsx
+ plans/260802-1809-phase12-txn-polish/plan.md
+ plans/260802-1809-phase12-txn-polish/reports/phase12-txn-polish-260802-1809-report.md
```
