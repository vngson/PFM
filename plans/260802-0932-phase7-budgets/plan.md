# Phase 7 — Budgets CRUD + tracking

**Status**: COMPLETED
**Started**: 2026-08-02 09:32
**Plan dir**: `plans/260802-0932-phase7-budgets/`

## Goal

Cho phép user đặt hạn mức chi tiêu (budget) cho từng category theo từng tháng. Hệ thống tự động tính tổng đã chi trong tháng và cảnh báo khi vượt ngưỡng.

## Schema (đã có sẵn)

```sql
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0),
  period_month date not null,  -- luôn ngày 1 của tháng
  created_at timestamptz default now(),
  unique (user_id, category_id, period_month)
);
```

RLS: select/insert/update/delete own.

## Phases

| Step | File | Status |
|------|------|--------|
| 7.1 | `src/features/budgets/schema.ts` + `period.ts` | DONE |
| 7.2 | `src/features/budgets/actions.ts` (CRUD + listBudgetsWithSpent) | DONE |
| 7.3 | `src/features/budgets/budget-form.tsx` + `budget-list.tsx` | DONE |
| 7.4 | `src/app/(protected)/budgets/page.tsx` + enable nav | DONE |
| 7.5 | Verify build + report | DONE |

## Acceptance criteria

- [x] Zod validate amount > 0, period_month regex YYYY-MM
- [x] Insert/update/delete budget thông qua Server Actions
- [x] Handle unique constraint (23505) → "Đã có ngân sách cho danh mục này trong tháng"
- [x] listBudgetsWithSpent join categories + sum(transactions.amount WHERE expense AND period)
- [x] Form: category filter expense only, period_month `<input type="month">`, amount
- [x] List: card với icon, progress bar (income/expense/over colors), "Còn X / Vượt X", badge status
- [x] Summary chip tháng: tổng hạn mức + đã chi + % progress + số rule vượt
- [x] Month switcher với Chevron prev/next URL
- [x] Nav `/budgets` enable (bỏ `soon` flag)
- [x] Build pass

## Files

```
src/features/budgets/
  schema.ts             # zod: category_id, amount, period_month (YYYY-MM)
  period.ts             # monthToPeriod, periodToMonth, prev/next/currentMonth
  actions.ts            # CRUD + listBudgetsWithSpent + listExpenseCategoriesForBudget
  budget-form.tsx       # Dialog create/edit
  budget-list.tsx       # Summary chip + grid cards với progress bar
src/app/(protected)/budgets/page.tsx  # Month switcher + render list
src/features/dashboard/nav-links.tsx  # Bỏ soon flag cho /budgets
```

## Risks / Notes

- **Unique constraint handling**: Postgres `23505` error code → friendly message tiếng Việt.
- **period_month format**: UI dùng `<input type="month">` (YYYY-MM), DB lưu YYYY-MM-01. Schema transform giữa 2 format.
- **Performance**: listBudgetsWithSpent chạy 2 query song song (budgets + transactions aggregate). Tạm thời load full transactions rồi reduce trong JS; nếu scale lớn có thể chuyển sang SQL aggregate function.
- **Categories filter expense**: Budgets chỉ áp dụng cho category chi tiêu (income/transfer không track budget).
- **Progress bar visual**: clamp width ở 100% để không tràn; status text vẫn hiển thị % thật + warning khi vượt.

## Reports

- `reports/phase7-budgets-260802-0932-report.md`