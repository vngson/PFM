# Phase 6 — Recurring transactions CRUD + manual generate

**Status**: COMPLETED
**Started**: 2026-08-01 22:49
**Plan dir**: `plans/260801-2249-phase6-recurring/`

## Goal

Cho phép user tạo quy tắc giao dịch định kỳ (daily/weekly/monthly/yearly) và sinh giao dịch thủ công từ rule đến hạn. Recurring không support transfer (DB constraint `recurring_no_transfer`).

## Approach: manual generate button

User bấm "Sinh GD" trên từng rule đến hạn, hoặc "Sinh tất cả (N)" ở header để sinh hết các rule đã due. Sau khi generate, `next_run_at` advance sang kỳ tiếp theo (nếu còn trong `end_date`) hoặc deactivate rule.

## Phases

| Step | File | Status |
|------|------|--------|
| 6.1 | `src/features/recurring/schema.ts` + `src/features/recurring/frequency.ts` | DONE |
| 6.2 | `src/features/recurring/actions.ts` (CRUD + generateFrom + generateAllDue) | DONE |
| 6.3 | `src/features/recurring/recurring-form.tsx` + `recurring-list.tsx` | DONE |
| 6.4 | `src/app/(protected)/recurring/page.tsx` + nav link | DONE |
| 6.5 | Verify `pnpm build` + report | DONE |

## Acceptance criteria

- [x] Schema zod validate frequency + type (no transfer)
- [x] advanceDate handle month-end + leap-year
- [x] createRecurring: insert + next_run_at = start_date
- [x] generateFromRecurring: insert txn + advance next_run_at (or deactivate nếu qua end_date)
- [x] generateAllDue: bulk tất cả rule có next_run_at <= today
- [x] Form: type filter category, frequency dropdown, start/end date, note
- [x] List: row với icon, badge frequency, nút Sinh GD (highlight rule đến hạn), menu Bật/Tắt/Xoá
- [x] Page: server fetch + list, header có "Sinh tất cả (N)" nếu có due
- [x] Nav có link `/recurring` với icon `Repeat`
- [x] Build pass

## Files

```
src/features/recurring/
  schema.ts             # zod: frequency, amount, type (no transfer), start/end
  frequency.ts          # advanceDate, FREQUENCY_LABELS, todayIso, diffDays
  actions.ts            # CRUD + generateFromRecurring + generateAllDue + listRecurring
  recurring-form.tsx    # Dialog create/edit với frequency select + start/end
  recurring-list.tsx    # Card list + Sinh GD button + Pause/Play + Delete
src/app/(protected)/recurring/page.tsx  # Server fetch + render list + "Sinh tất cả"
src/features/dashboard/nav-links.tsx    # Thêm /recurring link
```

## Risks / Notes

- **Frequency dropdown**: base-ui `Select.Root` `onValueChange` trả `string | null`; hidden input cần update DOM thủ công khi thay đổi (không có `name` prop binding cho Select).
- **Type transfer**: DB constraint `recurring_no_transfer` → zod enum chỉ `['income', 'expense']`.
- **next_run_at boundary**: month-end rollover (31 → tháng 2 → 28/29) + leap day (29/2 → 28/2 năm không nhuận) handle trong `advanceDate`.
- **bulk generate**: gọi lần lượt trong loop để mỗi rule có revalidate riêng; performance OK vì scale nhỏ.
- **Edit dialog**: base-ui Dialog không cho trigger từ bên ngoài → render `<RecurringForm>` inline với trigger nội bộ (button Sửa) thay vì menu item.

## Reports

- `reports/phase6-recurring-260801-2249-report.md`