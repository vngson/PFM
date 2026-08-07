# Phase 7 Report — Budgets CRUD + tracking

**Date**: 2026-08-02 09:32
**Scope**: Per-category monthly budgets with progress bar + over-budget warning
**Outcome**: ✅ Build pass, route `/budgets` live

## Deliverables

### 7.1 Schema + helpers

- `src/features/budgets/schema.ts`: zod với `category_id` (UUID), `amount > 0` (transform sang Number), `period_month` regex `^\d{4}-\d{2}$` (transform sang YYYY-MM-01).
- `src/features/budgets/period.ts`: `monthToPeriod`, `periodToMonth`, `currentMonth`, `previousMonth`, `nextMonth`.

### 7.2 Server Actions

- `createBudget`: parse → insert → handle `23505` unique violation với friendly message.
- `updateBudget(id)`: ownership check → update.
- `deleteBudget(id)`: delete.
- `listBudgetsWithSpent(month)`: parallel query
  1. budgets WHERE `period_month = YYYY-MM-01` JOIN categories
  2. transactions expense WHERE `occurred_at` trong tháng AND `category_id NOT NULL`
  - Sau đó reduce transactions thành Map `category_id → sum(amount)` rồi attach `spent` vào từng budget row.
- `listExpenseCategoriesForBudget`: filter `type = 'expense'`.

### 7.3 UI components

- `budget-form.tsx`: Dialog với
  - Category Select (expense only, có icon swatch)
  - `<Input type="month">` cho period
  - Amount input
  - Form shake animation on error.
- `budget-list.tsx`:
  - Summary chip tháng (tổng hạn mức / đã chi / % progress / số rule vượt)
  - Grid cards 2 cột, mỗi card:
    - Icon category + badge status (Trong hạn / Sắp hết ≥80% / Vượt ≥100%)
    - Số tiền: `spent / limit`, phần còn / phần vượt
    - Progress bar 4px, màu income (OK), expense/80 (sắp hết), expense (vượt)
    - Warning text khi vượt
  - Edit form inline (base-ui Dialog trigger), dropdown Xoá qua AlertDialog.

### 7.4 Route page

- `src/app/(protected)/budgets/page.tsx`:
  - Month switcher với ChevronLeft/Right URL `?month=YYYY-MM`
  - Server fetch song song budgets + categories
  - Empty state khi chưa có expense category
  - Label tháng dạng "Tháng 8 2026".
- `src/features/dashboard/nav-links.tsx`: bỏ `soon: true` cho `/budgets`. Thêm `NavLink` interface để TypeScript biết type của `soon?`.

## Type error gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `aria-disabled={isSoon}` → unknown | Sau khi bỏ `soon: true` cuối cùng, TS suy luận `'soon' in link` thành `boolean \| undefined` | Thêm `NavLink` interface với `soon?: boolean` → narrowing OK |

## Build verification

```
✓ Compiled successfully in 5.5s
✓ Generating static pages (16/16)
ƒ /budgets  server-rendered on demand
```

Routes: `/`, `/accounts`, `/auth/callback`, `/budgets`, `/categories`, `/check-email`, `/dashboard`, `/error`, `/login`, `/recurring`, `/signup`, `/transactions`.

## Decisions

- **Period format**: UI dùng `YYYY-MM` (native HTML5 month input), DB lưu `YYYY-MM-01` (date type). Schema transform canonicalize.
- **Categories filter**: chỉ expense. Income/transfer không có ý nghĩa budget.
- **Aggregate trong JS thay vì SQL**: số lượng transaction/tháng ~30 (scale nhỏ), không cần thêm SQL function. Nếu scale lên nghìn rows → switch sang SQL aggregation.
- **Progress bar visual**: width clamp 100% để không tràn layout; % thật hiển thị trong text + warning.
- **Edit form**: base-ui Dialog trigger không cross-component → render `<BudgetForm trigger="edit">` inline cạnh dropdown More.

## Open questions

- Có cần budget cho income (mục tiêu tiết kiệm) không? Có thể thêm sau nếu user cần.
- Budget carry-over (chuyển budget tháng này sang tháng sau nếu chưa hết) — phase sau.
- Multi-currency: hiện tại listBudgetsWithSpent group theo category, không group theo currency. Nếu user có nhiều currency → cần rework để budget riêng per (category, account.currency_code).

## Files modified/created

```
+ src/features/budgets/schema.ts
+ src/features/budgets/period.ts
+ src/features/budgets/actions.ts
+ src/features/budgets/budget-form.tsx
+ src/features/budgets/budget-list.tsx
+ src/app/(protected)/budgets/page.tsx
~ src/features/dashboard/nav-links.tsx
+ plans/260802-0932-phase7-budgets/plan.md
+ plans/260802-0932-phase7-budgets/reports/phase7-budgets-260802-0932-report.md
```