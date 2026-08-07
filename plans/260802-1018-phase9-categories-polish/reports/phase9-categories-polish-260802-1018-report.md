# Phase 9 Report — Categories edit/delete polish

**Date**: 2026-08-02 10:18
**Scope**: Dropdown menu cho edit/delete + usage badge + delete warning
**Outcome**: ✅ Build pass, UX gọn hơn + safety tốt hơn

## Deliverables

### 9.1 Actions update

`src/features/categories/actions.ts`:
- `countCategoryUsage(categoryId)` — parallel count 3 tables (transactions + budgets + recurring) với `count: 'exact', head: true`.
- Helper return `{ txn, budget, recurring }`. RLS tự lọc theo user.

### 9.2 CategoryList polish

`src/features/categories/category-list.tsx`:
- **Lazy-load usage**: `useEffect` chạy `Promise.all(categories.map(countCategoryUsage))` sau mount. Set cancelled flag để tránh setState sau unmount. Sync với `categoryIdsKey` thay vì reference để tránh re-run không cần thiết.
- **Dropdown menu** (`MoreVertical` icon): thay 2 nút riêng bằng 1 menu trigger. Items: Sửa (Pencil) + Xoá (Trash2, variant destructive).
- **Default categories**: không có menu (read-only).
- **Usage badge** (`UsageBadge` sub-component):
  - 0 usages → "Chưa có giao dịch"
  - Có usages → "12 GD · 2 NS · 1 ĐK" (GD=giao dịch, NS=ngân sách, ĐK=định kỳ)
- **Delete warning**: AlertDialog có 2 nhánh — nếu `totalUsage > 0` hiển thị AlertTriangle icon + message đỏ + nút Xoá disabled; nếu 0 thì confirm thường.
- **Edit form**: render 1 instance `<CategoryForm>` ở root với `key={editingCategory.id}` + controlled `open`/`onOpenChange`. Click "Sửa" trong dropdown → `setEditingId(cat.id)` → form mở với state reset.

### 9.3 CategoryForm mở rộng

`src/features/categories/category-form.tsx`:
- Thêm `trigger?: 'create' | 'edit' | 'hidden'` prop. Mặc định `undefined` (giữ behavior cũ dùng `isEdit` để chọn icon).
- Thêm `open` + `onOpenChange` controlled props. Nếu không truyền → form tự quản lý `useState(false)`.
- `useEffect` reset state (type/icon/color) khi `open && category` để đảm bảo form edit luôn sync với category hiện tại (parent dùng `key` để remount nhưng có fallback).
- Render `DialogTrigger` chỉ khi `trigger !== 'hidden'`.

## Build verification

```
✓ Compiled successfully in 8.3s
✓ Generating static pages (16/16)
ƒ /categories  server-rendered on demand
```

## Decisions

- **Dropdown menu thay vì inline buttons**: 2 nút (Edit/Delete) chiếm nhiều space, dễ click nhầm. 1 dropdown trigger gọn + neo-brutalism style phù hợp.
- **Usage count lazy-load** thay vì server-fetch: parallel 3 count queries chạy nhanh (~50ms), nhưng render UX quan trọng hơn. Show loading dot trong lúc chờ.
- **Delete warning UX**: hiển thị message + disable button khi có usage. DB sẽ reject anyway (23503) nhưng UX tốt hơn vì user thấy trước khi click.
- **Key-based remount** CategoryForm: dùng `key={editingCategory.id}` thay vì internal reset, đảm bảo clean slate mỗi lần edit category khác. Tránh bug "edit A → edit B mà vẫn thấy data của A".
- **Default categories readonly**: là core seed data, không nên sửa/xoá. Menu ẩn hoàn toàn.

## Open questions

- Nên cho phép archive category thay vì xoá cứng? Phase sau có thể thêm `archived` flag.
- Bulk operations (multi-select + delete/archive nhiều category cùng lúc)?

## Files modified

```
~ src/features/categories/actions.ts
~ src/features/categories/category-list.tsx
~ src/features/categories/category-form.tsx
+ plans/260802-1018-phase9-categories-polish/plan.md
+ plans/260802-1018-phase9-categories-polish/reports/phase9-categories-polish-260802-1018-report.md
```
