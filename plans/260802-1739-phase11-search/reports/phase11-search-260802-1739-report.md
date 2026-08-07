# Phase 11 Report — Global search (Cmd+K)

**Date**: 2026-08-02 17:39
**Scope**: Command palette search 3 entity types
**Outcome**: ✅ Build pass

## Deliverables

### 11.1 Search action

`src/features/search/actions.ts`:
- `globalSearch(query)` — parallel 3 query (transactions note ilike, accounts name, categories name), max 5/group.
- Trả `SearchResults { transactions, accounts, categories, total }`.
- Mỗi `SearchResult` có `type`, `id`, `title`, `subtitle`, `meta`, `href`.
- Transaction result có `+amount`/`-amount` cho income/expense, transfer chỉ show amount.

### 11.2 Command palette

`src/features/search/command-palette.tsx`:
- Dialog (base-ui) với top:10vh translate override.
- Input + kbd Esc hint + loading spinner.
- Grouped results: Giao dịch / Tài khoản / Danh mục.
- Keyboard nav: ↑↓ (activeIdx), Enter (select), Esc (close), Cmd/Ctrl+K (toggle).
- Flat array index cho keyboard nav.
- Footer chip "N kết quả" + "↩ để chọn".
- Empty state với 3 gợi ý + ví dụ.

### 11.3 Wire vào header

`src/features/search/search-trigger.tsx`:
- Controlled state ở trigger, render `<CommandPalette open onOpenChange>`.
- Lắng nghe global event `palette:open` (future-proof cho shortcut khác).
- Button với Search icon + "Tìm kiếm…" + kbd "⌘K".

`src/app/(protected)/layout.tsx`:
- Thêm `<SearchTrigger />` giữa NavLinks và UserAvatar.

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `t.account as { name: string }` — type array vs single | Supabase trả `account:accounts(...)` thành `array \| null` theo schema | Cast `as { name: string }[] \| null` rồi `[0]?.name` |
| `setOpen((o) => !o)` — controlled setter | open đã controlled → không dùng functional setter | Dùng `setOpen(!open)` |

## Build verification

```
✓ Compiled successfully in 7.0s
✓ Generating static pages (16/16)
```

## Decisions

- **Debounce 200ms**: balance giữa responsiveness và server load. Gõ nhanh sẽ chỉ fire 1 request sau khi dừng.
- **Search 3 entity cùng lúc**: parallel qua `Promise.all`. Server ~50ms với data demo. Phase sau có thể dedup queries hoặc thêm index `text_search` trên note/name.
- **Cmd/Ctrl+K shortcut global**: register listener 1 lần ở root. Palette tự đóng khi user chọn result.
- **Transaction href về `/transactions?q=...`**: forward-compat với Phase 12 (transactions page đã có search box).
- **Empty state gợi ý**: user mới biết search theo note, không phải amount.

## Open questions

- Search account balance range (vd: ">1M")? Phase sau nếu cần.
- Recent searches cache localStorage? Phase sau nếu cần.
- Filter theo type (chỉ tìm giao dịch / chỉ tìm danh mục)?

## Files modified/created

```
+ src/features/search/actions.ts
+ src/features/search/command-palette.tsx
+ src/features/search/search-trigger.tsx
~ src/app/(protected)/layout.tsx
+ plans/260802-1739-phase11-search/plan.md
+ plans/260802-1739-phase11-search/reports/phase11-search-260802-1739-report.md
```
