# Phase 4 — Transactions Filter + Search + Pagination

**Status**: DONE
**Date**: 2026-08-01
**Slug**: `260801-2224-phase4-txns-filter-search`

## Phases

| Step | Mô tả | Status |
|---|---|---|
| 4.1 | URL-driven filter (type + q) trong actions + page | DONE |
| 4.2 | `SearchBox` debounced 350ms, push ?q= | DONE |
| 4.3 | `FilterChipRow` 4 chip (Tất cả/Thu/Chi/Chuyển) | DONE |
| 4.4 | `LoadMore` cursor pagination (limit 50/trang) | DONE |
| 4.5 | Build + report | DONE |

## URL Contract
- `?month=YYYY-MM` — tháng (đã có từ Phase 3, default = tháng hiện tại)
- `?type=income|expense|transfer` — filter loại (Phase 4 mới)
- `?q=text` — search note (Phase 4 mới)
- `?before=YYYY-MM-DD` — cursor load more (Phase 4 mới)

Mọi URL param đều shareable + back/forward hoạt động. Clear filter = xóa param.

## Dependencies
- `listTransactions` từ Phase 3 (cần refactor signature trả về `{rows, hasMore}` thay vì array)
- `useSearchParams` + `useRouter` từ next/navigation
- `useTransition` để smooth UX khi thay đổi URL

## Acceptance Criteria
- [x] 4 chip filter hoạt động, click push URL
- [x] Active chip highlight theo `bg-secondary text-secondary-foreground`
- [x] Search debounced 350ms trước khi push URL
- [x] Search escape ký tự đặc biệt `%`/`_` của ilike
- [x] Load-more cursor dựa trên `occurred_at` của row cuối
- [x] Filter + search reset cursor (`before` bị xóa khi đổi filter)
- [x] Empty state khi filter không khớp → gợi ý "Xóa bộ lọc"
- [x] Build sạch (5.6s + 5.2s typecheck), 0 error
- [x] Type-safe URL parsing (`/^\d{4}-\d{2}$/`, `TYPE_VALUES.find`)

## Files

### Tạo mới
- `src/features/transactions/filter-chip-row.tsx`
- `src/features/transactions/search-box.tsx`
- `src/features/transactions/load-more.tsx`

### Sửa
- `src/features/transactions/actions.ts` — `listTransactions` trả về `{rows, hasMore}`, thêm filter `type` / `q` / `before`
- `src/features/transactions/transaction-list.tsx` — thêm props `isFiltered` + `clearHref` cho empty state
- `src/app/(protected)/transactions/page.tsx` — đọc URL params, truyền vào listTransactions, render FilterChipRow + SearchBox + LoadMore

## Risks
- URL search params reset mỗi navigation → nếu user back từ Create sẽ giữ filter. Acceptable (URL là source-of-truth).
- `ilike` với note không escape đầy đủ ký tự đặc biệt của Postgres regex (chỉ escape `%`/`_`) — wildcards chính giữa từ có thể cho kết quả unexpected nhưng an toàn.
- Cursor pagination dùng `lt occurred_at` — nếu nhiều txns cùng ngày có thể skip/bỏ sót giữa 2 lần load. Acceptable vì user còn có `type` filter để narrow.

## Rollback
- Xóa 3 file mới + revert 3 file sửa.
- URL params mới → old page không đọc → fallback về default flow.
