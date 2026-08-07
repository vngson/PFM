# Phase 13 — CSV export

**Status**: COMPLETED
**Started**: 2026-08-02 18:39
**Plan dir**: `plans/260802-1839-phase13-csv-export/`

## Goal

Cho phép user xuất CSV:
- Transactions (date, type, amount, account, category, note)
- Accounts (name, type, currency, initial/current balance, archived)
- Categories (name, type, icon, color, default)

## Approach

- Server actions `exportTransactionsCSV` / `exportAccountsCSV` / `exportCategoriesCSV`: query Supabase, map row về object với Vietnamese headers, escape + join về CSV.
- BOM `﻿` + CRLF cho Excel tiếng Việt.
- `<ExportButton action={...}>` client component: gọi action → Blob → download.
- Wire button vào 3 pages: /transactions, /accounts, /categories.

## Phases

| Step | File | Status |
|------|------|--------|
| 13.1 | `actions.ts` — 3 export functions + csvEscape | DONE |
| 13.2 | `export-button.tsx` + wire vào 3 pages | DONE |
| 13.3 | Verify + report | DONE |

## Acceptance criteria

- [x] 3 server actions export CSV
- [x] CSV header tiếng Việt
- [x] Escape chuẩn RFC 4180 (quote + double quote)
- [x] BOM cho Excel UTF-8
- [x] ExportButton trigger download qua Blob
- [x] Build pass

## Files

```
+ src/features/export/actions.ts
+ src/features/export/export-button.tsx
~ src/app/(protected)/transactions/page.tsx
~ src/app/(protected)/accounts/page.tsx
~ src/app/(protected)/categories/page.tsx
+ plans/260802-1839-phase13-csv-export/plan.md
+ plans/260802-1839-phase13-csv-export/reports/phase13-csv-export-260802-1839-report.md
```

## Risks / Notes

- **Headers tiếng Việt**: Excel mở OK với BOM. Google Sheets mở thẳng không cần BOM.
- **RLS**: query đã filter theo user_id. CSV chỉ chứa data của user hiện tại.
- **Filename**: `transactions-2026-08-02.csv` với date stamp. Có thể thêm range filter (theo tháng) phase sau.

## Reports

- `reports/phase13-csv-export-260802-1839-report.md`
