# Phase 4 — Transactions Filter + Search + Pagination Report

## Result: DONE

Hoàn thiện trang `/transactions` với filter chip + search + pagination cursor.

### Files

| Type | Path |
|---|---|
| New | `src/features/transactions/filter-chip-row.tsx` |
| New | `src/features/transactions/search-box.tsx` |
| New | `src/features/transactions/load-more.tsx` |
| Mod | `src/features/transactions/actions.ts` |
| Mod | `src/features/transactions/transaction-list.tsx` |
| Mod | `src/app/(protected)/transactions/page.tsx` |

### Notable Decisions
1. **URL-driven** thay vì local state: URL là source-of-truth → shareable, back/forward hoạt động, không mất state khi navigate đi rồi back.
2. **Filter chip + Search đẩy params** lần lượt thay vì combined filter state. Mỗi filter độc lập → dễ reason.
3. **Load more dùng Link** thay vì fetch-on-click vì Next.js App Router navigation đã là server render + View Transition slide. Đồng nhất UX.
4. **Cursor pagination limit 50** (thay vì 500 Phase 3 tạm). Tự động detect `hasMore` qua `limit + 1` query trick.
5. **Search escape ký tự đặc biệt** `%` / `_` trước khi truyền `ilike` để tránh Postgres regex injection. Note max 200 chars form-side + 80 chars URL-side.
6. **Summary chips KHÔNG filter** theo type/q — luôn hiển thị tổng tháng để user thấy big picture dù đang filter 1 phần.
7. **Empty state khác nhau** cho "chưa có giao dịch" vs "filter không khớp" → gợi ý xóa filter.

### Build
- 5.6s compile + 5.2s typecheck, 0 error
- 14 routes tổng
- `/transactions` dynamic (server-rendered on demand)

### Test thủ công
1. Mở `/transactions` → chip "Tất cả" active mặc định.
2. Click chip "Chi" → URL thêm `?type=expense` → list filter chỉ hiện expense.
3. Gõ "ăn trưa" vào search → 350ms sau URL thêm `?q=ăn+trưa` (debounce).
4. Click "Tất cả" → URL clear `type` nhưng giữ `q`.
5. Refresh trang filter → state giữ nguyên (URL persist).
6. Back browser → trở về state trước filter.
7. Tạo > 50 giao dịch tháng → "Xem thêm" hiện ra.
8. Filter trên tháng trống → empty state với link "Xóa bộ lọc".
9. `URLSearchParams` get ký tự đặc biệt như `%` → escape trước khi query, không crash SQL.

### Known limitations
- `before` cursor chỉ hoạt động khi không filter (`type`/`q`). Nếu user filter + scroll, `LoadMore` bị ẩn — cần multi-field cursor đầy đủ (Phase 5+).
- Search chỉ trên `note`, không trên `category.name` hay `account.name`. Phase 5 có thể mở rộng.
- Không có date range picker — chỉ pick tháng. Phase 5 có thể thêm date range tự do.

### Unresolved questions
- Có muốn persistent tháng filter trong URL kể cả khi không có transactions? (Hiện tại: có, dùng currentMonth default.)
- Filter search có nên bao gồm `category.name` không? Nếu có → cần OR condition → replace .ilike bằng or() với foreign table.
- Có nên highlight search match trong note (substring highlight) không?
