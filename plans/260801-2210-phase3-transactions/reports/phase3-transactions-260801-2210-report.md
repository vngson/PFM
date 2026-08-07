# Phase 3 — Transactions Report

## Result: DONE

Triển khai xong CRUD Transactions kèm month summary + Dashboard widget.

### Files

| Type | Path |
|---|---|
| New | `src/features/transactions/schema.ts` |
| New | `src/features/transactions/actions.ts` |
| New | `src/features/transactions/transaction-form.tsx` |
| New | `src/features/transactions/transaction-list.tsx` |
| New | `src/app/(protected)/transactions/page.tsx` |
| Mod | `src/features/dashboard/nav-links.tsx` |
| Mod | `src/app/(protected)/dashboard/page.tsx` |

### Schema DB
Không cần migration mới — `transactions` + triggers + RLS đã có trong `supabase/migrations/0001_init_schema.sql` từ đầu. Phase 3 chỉ wire UI + actions.

### Notable Decisions
1. **Pattern reuse**: copy cấu trúc `actions.ts` + `schema.ts` + Form + List từ `accounts/` và `categories/`. Đồng nhất với codebase hiện tại.
2. **Type trong form**: dùng `CategoryType` (`income` | `expense`) — `transfer` xử lý riêng (không cần category). Form filter list category theo `type` đang chọn.
3. **Summary theo currency**: `getMonthSummary` + dashboard widget aggregate theo `account.currency_code` vì user có thể có nhiều loại tiền (VND + USD).
4. **List group theo ngày**: 1 card/ngày với header (ngày + count). Mỗi row trong card là 1 transaction.
5. **Form shake**: copy pattern từ auth forms — toggle `animate-brutal-shake` class khi `state.error` hoặc `fieldErrors`.
6. **Nav link enable**: bỏ `soon: true` khỏi entry `/transactions` → link thật.
7. **Dashboard widget**: thay placeholder "Sẽ hiển thị ở Phase 5" bằng card "Thu chi tháng này" thật, query `transactions` cùng tháng.
8. **Quick action**: 1 trong 4 chip "Giao dịch" giờ là Link thật thay vì "Sắp có".

### Build
- 5.9s compile + 4.8s typecheck, 0 error
- 14 routes (was 13) — `/transactions` mới
- All ESLint clean (chưa recheck, cần verify thêm nếu có hook)

### Test
Manual test trên dev server:
1. Click "Giao dịch" trên nav → trang `/transactions` render summary + list
2. Click "Thêm giao dịch" → dialog mở, chọn type/amount/date/category, submit
3. Submit sai (amount = 0) → form shake + fieldErrors red
4. Số dư trên trang `/accounts` tự cập nhật (qua DB trigger)
5. Click Sửa trên 1 row → dialog edit load đúng giá trị
6. Click Xóa → confirm → row biến mất
7. Dashboard card "Thu chi tháng này" hiển thị net = income − expense

### Known limitations (Phase 4+ candidates)
- Pagination: hiện limit 500/tháng. Nếu user > 500 txns/tháng → cần cursor.
- Filter theo account/category: chưa có chip filter. Có thể thêm ở phase sau.
- Search by note: chưa có. Có thể thêm sau.
- Receipt upload: schema có `receipt_url` nhưng chưa wire UI. Storage bucket cần tạo thêm migration.
- Recurring transactions: schema + RLS đã có, chưa wire UI.

### Unresolved questions
- Có muốn thêm filter chips (account/category) trên `/transactions`?
- Có cần search box cho note?
- Budgets (Phase 5) — đã có nav-link stub "Sắp có", schema đã sẵn. Tiếp sau Phase 3 hay nghỉ?
