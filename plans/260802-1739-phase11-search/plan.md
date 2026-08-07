# Phase 11 — Global search (Cmd+K)

**Status**: COMPLETED
**Started**: 2026-08-02 17:39
**Plan dir**: `plans/260802-1739-phase11-search/`

## Goal

Cmd/Ctrl+K command palette để search toàn cục:
- Transactions (theo note)
- Accounts (theo name)
- Categories (theo name)
- Keyboard nav (↑↓ + Enter)
- Debounced 200ms

## Approach

- `globalSearch(query)` Server Action: parallel 3 query với `ilike` pattern, max 5/group.
- `CommandPalette` component: Dialog, debounce 200ms, ArrowUp/Down/Enter/Escape, grouped results.
- `SearchTrigger` mount trong header, quản lý state + render `<CommandPalette>` controlled.
- Cmd/Ctrl+K shortcut global.

## Phases

| Step | File | Status |
|------|------|--------|
| 11.1 | `actions.ts` — globalSearch | DONE |
| 11.2 | `command-palette.tsx` — Dialog + keyboard nav | DONE |
| 11.3 | `search-trigger.tsx` + header wire + verify | DONE |

## Acceptance criteria

- [x] Cmd/Ctrl+K mở palette
- [x] Search 3 loại: transactions (note ilike), accounts (name), categories (name)
- [x] Debounce 200ms
- [x] ↑↓ navigate, Enter select, Escape close
- [x] Click outside close
- [x] Empty state với gợi ý
- [x] Loading spinner khi đang search
- [x] Build pass

## Files

```
+ src/features/search/actions.ts
+ src/features/search/command-palette.tsx
+ src/features/search/search-trigger.tsx
~ src/app/(protected)/layout.tsx            # + SearchTrigger
+ plans/260802-1739-phase11-search/plan.md
+ plans/260802-1739-phase11-search/reports/phase11-search-260802-1739-report.md
```

## Risks / Notes

- **Transactions chỉ search note**: amount/account/category không search (trade-off: ilike số → chậm). Phase sau có thể expand.
- **Search ở server**: secure + RLS tự filter. Round-trip ~50ms, debounce 200ms OK.
- **Max 5/group**: đủ cho 90% case. Phase sau có thể phân trang hoặc "show more".
- **Href của transaction**: trỏ về `/transactions?q=<note>` — cần Phase 12 mới wire search box hiện tại.

## Reports

- `reports/phase11-search-260802-1739-report.md`
