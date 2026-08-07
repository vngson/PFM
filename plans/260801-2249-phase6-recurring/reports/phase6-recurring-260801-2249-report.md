# Phase 6 Report — Recurring CRUD + manual generate

**Date**: 2026-08-01 22:49
**Scope**: Recurring transactions — CRUD + manual generate button
**Outcome**: ✅ Build pass, route `/recurring` live

## Deliverables

### 6.1 Schema + helpers

- `src/features/recurring/schema.ts`: zod với `frequency ∈ [daily, weekly, monthly, yearly]`, `type ∈ [income, expense]` (không transfer do DB constraint `recurring_no_transfer`). Transform `amount`, `start_date`, `end_date` về canonical types.
- `src/features/recurring/frequency.ts`:
  - `FREQUENCY_LABELS` mapping `daily → 'Hằng ngày'` etc.
  - `advanceDate(from, freq)`: month-end rollover (31/01 → 28/02), leap day (29/02/2024 → 28/02/2025).
  - `todayIso()`, `diffDays(a, b)`.

### 6.2 Server Actions (`actions.ts`)

- `createRecurring(_prev, fd)`: zod → insert với `next_run_at = start_date`, `is_active = true`.
- `updateRecurring(id, _prev, fd)`: ownership check → update fields (không touch `next_run_at` — user không nên tự ý sửa nó).
- `toggleRecurring(id, isActive)`: bật/tắt.
- `deleteRecurring(id)`: xoá rule.
- `listRecurring(includeInactive)`: order by `is_active DESC, next_run_at ASC`. Include cả inactive (toggle off) để user thấy rule đang tạm dừng.
- `generateFromRecurring(id)`:
  - Skip nếu `next_run_at > today` hoặc `!is_active`.
  - Insert `transactions` row với `occurred_at = next_run_at`, note prefix `[Định kỳ]`.
  - Compute `next_run_at` mới qua `advanceDate`; nếu > `end_date` → set `next_run_at = null, is_active = false`.
  - Revalidate `/recurring`, `/transactions`, `/dashboard`, `/accounts`.
- `generateAllDue()`: select tất cả rule active có `next_run_at <= today`, loop `generateFromRecurring`. Trả `{inserted, ruleCount}`.

### 6.3 UI components

- `recurring-form.tsx`: Dialog với form fields giống transaction-form nhưng:
  - Type filter chỉ income/expense (no transfer).
  - Frequency Select (controlled workaround qua hidden input + DOM update).
  - Start/end date (end optional).
  - Same `useActionState` + form shake pattern.
- `recurring-list.tsx`:
  - Card layout (mỗi rule 1 card thay vì table row).
  - Badge frequency + type + tạm dừng.
  - "Sinh GD" button nổi bật khi `next_run_at <= today && is_active`.
  - Dropdown menu: Bật/Tắt + Xoá.
  - Inline `<RecurringForm trigger="edit">` cạnh dropdown để Edit.
  - Empty state với `<Repeat>` icon.

### 6.4 Route page

- `src/app/(protected)/recurring/page.tsx`: Server Component fetch `listRecurring(true)` + accounts + categories song song. Render "Sinh tất cả (N)" button nếu có rule đến hạn (form action gọi `generateAllDue` server action).
- `src/features/dashboard/nav-links.tsx`: thêm link `/recurring` với icon `Repeat`.

## Type errors gặp & fix

| Lỗi | Nguyên nhân | Fix |
|------|-------------|-----|
| `listRecurring` return thiếu `id` trên account | Pick bỏ sót | Thêm `'id'` vào select + Pick |
| CategoryLite thiếu `id`, `type` | Tương tự | Thêm vào select, narrowing `'income' \| 'expense'` |
| `onValueChange` freq trả `string \| null` | base-ui signature | Guard `if (!v) return;` |
| `Record<Row['type'], ...>` thiếu `transfer` | Recurring chỉ 2 type | Định nghĩa `RecurringType = 'income' \| 'expense'`, cast `row.type as RecurringType` |

## Build verification

```
✓ Compiled successfully in 4.9s
✓ Generating static pages (15/15)
ƒ /recurring   server-rendered on demand
```

Routes: `/`, `/accounts`, `/auth/callback`, `/categories`, `/check-email`, `/dashboard`, `/error`, `/login`, `/recurring`, `/signup`, `/transactions`.

## Decisions

- **Manual generate button** (đã chọn ở phase plan): user chủ động bấm thay vì cron tự động. Phù hợp cho MVP, dễ debug. Cron có thể thêm sau qua Edge Function / Supabase scheduled trigger.
- **Edit menu**: base-ui Dialog không cho trigger từ menu item bên ngoài → render `<RecurringForm trigger="edit">` inline (button Sửa nằm trong row). UX hơi khác transaction-list (Edit trong dropdown) nhưng tránh phải hack trigger.
- **Frequency Select**: không bind `name` prop nên dùng hidden input + `formRef.current.elements.namedItem('frequency')` để update khi Select đổi value. Đủ tốt cho form submission.
- **Bulk action**: loop tuần tự thay vì Promise.all để mỗi rule revalidate riêng + dễ trace lỗi.
- **next_run_at = start_date** khi tạo: nếu start_date <= hôm nay, user bấm Sinh GD ngay được. Nếu start_date > hôm nay, button disabled, hiển thị "Chờ {date}".

## Open questions

- Cần cron job sinh tự động không? Phase sau có thể thêm Edge Function chạy daily.
- Có nên cho phép edit `next_run_at` thủ công không (vd skip 1 tháng)? Hiện tại chỉ toggle active.

## Files modified/created

```
+ src/features/recurring/schema.ts
+ src/features/recurring/frequency.ts
+ src/features/recurring/actions.ts
+ src/features/recurring/recurring-form.tsx
+ src/features/recurring/recurring-list.tsx
+ src/app/(protected)/recurring/page.tsx
~ src/features/dashboard/nav-links.tsx
+ plans/260801-2249-phase6-recurring/plan.md
+ plans/260801-2249-phase6-recurring/reports/phase6-recurring-260801-2249-report.md
```