# Phase 3 — Transactions

**Status**: DONE
**Date**: 2026-08-01
**Slug**: `260801-2210-phase3-transactions`

## Phases

| Step | Mô tả | Status |
|---|---|---|
| 3.1 | Zod schema `src/features/transactions/schema.ts` | DONE |
| 3.2 | Server actions `actions.ts` (CRUD + summary + helpers) | DONE |
| 3.3 | `TransactionForm` dialog (create/edit) + neo-brutalism | DONE |
| 3.4 | `TransactionList` group theo ngày + filter chips | DONE |
| 3.5 | Route `/transactions` + Dashboard widget thu chi tháng | DONE |
| 3.6 | Plan + report | DONE |

## Dependencies
- `transactions` table + RLS + triggers — đã có trong `supabase/migrations/0001_init_schema.sql`
- Pattern từ accounts/categories (form + list + actions + schema)
- Neo-brutalism tokens đã set từ `neo-brutalism-restyle` plan

## Acceptance Criteria
- [x] CRUD transaction qua Server Actions
- [x] Filter category theo type (transfer = no category)
- [x] Summary thu/chi tháng này group theo currency
- [x] List group theo ngày, có badge type, dấu +/−/⇄ cho amount
- [x] Dashboard widget "Thu chi tháng này" thay placeholder
- [x] Nav-link "Giao dịch" enable
- [x] Quick action "Giao dịch" → link thật
- [x] Build sạch (5.9s compile, 4.8s typecheck), không TS error
- [x] Form shake animation khi error (consistent với auth forms)
- [x] Balance tự động cập nhật qua DB trigger `trg_transactions_balance`

## Files

### Tạo mới
- `src/features/transactions/schema.ts`
- `src/features/transactions/actions.ts`
- `src/features/transactions/transaction-form.tsx`
- `src/features/transactions/transaction-list.tsx`
- `src/app/(protected)/transactions/page.tsx`

### Sửa
- `src/features/dashboard/nav-links.tsx` — bỏ `soon: true` cho `/transactions`
- `src/app/(protected)/dashboard/page.tsx` — thay card "Thu chi tháng này" + quick action

## Risks
- `account.current_balance` update qua trigger DB — nếu trigger chưa chạy (user chưa apply migration), balance sẽ không update. UI vẫn hoạt động nhưng số dư không đổi.
- `select('*, account:accounts(...), category:categories(...)')` — PostgREST aliasing nested; phải select đầy đủ fields cần type-check.
- Large list: tạm thời limit 500 rows/tháng. Nếu user có nhiều hơn → cần pagination. Phase 4+ nếu cần.

## Rollback
- Xóa dir `src/features/transactions/` + file `src/app/(protected)/transactions/page.tsx`
- Revert `nav-links.tsx` + `dashboard/page.tsx`
- Migration `0001_init_schema.sql` đã có từ trước — không cần revert
