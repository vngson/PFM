# Phase 9 — Categories edit/delete polish

**Status**: COMPLETED
**Started**: 2026-08-02 10:18
**Plan dir**: `plans/260802-1018-phase9-categories-polish/`

## Goal

Polish categories UX:
1. Edit + delete đã có action, cần polish UI để gọn hơn (1 dropdown menu)
2. Show usage badge (số giao dịch / ngân sách / định kỳ đang dùng category)
3. Confirm delete có warning khi category đang được sử dụng
4. Form edit mở qua dropdown (controlled open)

## Approach

- Thêm `countCategoryUsage(categoryId)` helper vào `actions.ts` — parallel count cho transactions + budgets + recurring.
- `CategoryList` dùng dropdown menu (`MoreVertical` icon) chứa Sửa + Xoá, thay vì 2 nút riêng.
- Lazy-load usage sau mount (không block render), badge hiển thị dạng "12 GD · 2 NS · 1 ĐK" hoặc "Chưa có giao dịch".
- AlertDialog delete có 2 nhánh: có usage → warning icon + nút Xoá disabled; không có usage → confirm thường.
- CategoryForm mở rộng để hỗ trợ `trigger="hidden"` + controlled `open`/`onOpenChange`. Reset state khi edit form mở.

## Phases

| Step | File | Status |
|------|------|--------|
| 9.1 | `src/features/categories/actions.ts` — thêm `countCategoryUsage` | DONE |
| 9.2 | `src/features/categories/category-list.tsx` — dropdown + usage badge | DONE |
| 9.3 | `src/features/categories/category-form.tsx` — `trigger="hidden"` + controlled | DONE |
| 9.4 | Verify build + report | DONE |

## Acceptance criteria

- [x] `countCategoryUsage(categoryId)` parallel count txns + budgets + recurring
- [x] CategoryList hiển thị usage badge dạng text inline
- [x] Dropdown menu (MoreVertical) chứa Sửa + Xoá
- [x] Default categories không có menu (read-only)
- [x] AlertDialog delete warning khi có usage
- [x] CategoryForm hỗ trợ `trigger="hidden"` + `open`/`onOpenChange`
- [x] Build pass

## Files

```
~ src/features/categories/actions.ts          # + countCategoryUsage
~ src/features/categories/category-list.tsx   # dropdown + usage badge + warning
~ src/features/categories/category-form.tsx   # trigger + controlled open
+ plans/260802-1018-phase9-categories-polish/plan.md
+ plans/260802-1018-phase9-categories-polish/reports/phase9-categories-polish-260802-1018-report.md
```

## Risks / Notes

- **Lazy-load usage**: chạy sau mount để không block initial render. Set cancelled flag để tránh setState sau unmount.
- **Key-based remount** CategoryForm khi edit id đổi: dùng `key={editingCategory.id}` để reset state hoàn toàn.
- **Delete warning**: hiển thị dù DB sẽ reject với 23503 FK violation. UX tốt hơn vì user thấy trước khi bấm.
- **Dropdown menu không có action label cho default categories**: hidden hoàn toàn (read-only).

## Reports

- `reports/phase9-categories-polish-260802-1018-report.md`
