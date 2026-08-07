# Phase 13 Report — CSV export

**Date**: 2026-08-02 18:39
**Scope**: Export transactions + accounts + categories to CSV
**Outcome**: ✅ Build pass

## Deliverables

### Export actions

`src/features/export/actions.ts`:
- `csvEscape(value)`: escape theo RFC 4180 (quote nếu có `,` `"` CR LF; double quote internal `"`).
- `toCsv(rows)`: keys làm header → escape từng cell → join `\r\n`. Prepend BOM `﻿` cho Excel UTF-8.
- 3 server actions: `exportTransactionsCSV` / `exportAccountsCSV` / `exportCategoriesCSV`. Trả `{ filename, content }`.

### ExportButton

`src/features/export/export-button.tsx`:
- Nhận `action: () => Promise<{ filename, content }>` prop.
- `useTransition` cho loading state + Loader2 icon.
- Blob → URL.createObjectURL → anchor click → revoke URL.
- Error → setError state → title attribute show error.

### Wire vào 3 pages

- `/transactions`: button cạnh form "Thêm giao dịch".
- `/accounts`: button cạnh form "Thêm tài khoản".
- `/categories`: button cạnh form "Thêm danh mục".

## Build verification

```
✓ Compiled successfully in 7.0s
✓ Generating static pages (16/16)
```

## Decisions

- **BOM + CRLF**: Excel yêu cầu BOM để nhận diện UTF-8, CRLF cho Windows. Trade-off: file size hơi to hơn nhưng Excel mở đúng tiếng Việt.
- **Headers tiếng Việt**: "Ngày", "Loại", "Số tiền"... user mở bằng Excel/Sheets sẽ thấy tên cột dễ hiểu.
- **CSV via Blob URL**: không cần backend file storage, download ngay. Memory OK cho vài nghìn rows.
- **Date stamp filename**: `transactions-2026-08-02.csv` — không trùng giữa các lần export.

## Open questions

- Filter range (theo tháng)? Phase sau.
- Export Excel (xlsx) trực tiếp? Phase sau nếu cần formula.
- Schedule auto-export weekly? Phase sau nếu user đòi.

## Files modified/created

```
+ src/features/export/actions.ts
+ src/features/export/export-button.tsx
~ src/app/(protected)/transactions/page.tsx
~ src/app/(protected)/accounts/page.tsx
~ src/app/(protected)/categories/page.tsx
+ plans/260802-1839-phase13-csv-export/plan.md
+ plans/260802-1839-phase13-csv-export/reports/phase13-csv-export-260802-1839-report.md
```
