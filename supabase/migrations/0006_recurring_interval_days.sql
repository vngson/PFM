-- =========================================================================
-- 0006_recurring_interval_days.sql
-- Mở rộng recurring_frequency enum + thêm column interval_days
-- để hỗ trợ rule "every N days" (vd phí Agribank trừ mỗi 30 ngày).
--
-- APPLY: paste TOÀN BỘ file này vào Supabase Dashboard → SQL Editor → Run MỘT LẦN.
--
-- Lưu ý về constraint:
-- Postgres yêu cầu enum value phải COMMIT trước khi được tham chiếu trong cùng
-- transaction. Supabase SQL Editor wrap cả script trong 1 transaction, nên
-- check constraint tham chiếu 'every_n_days' sẽ fail với 55P04 nếu viết ở đây.
-- Validation "every_n_days → interval_days NOT NULL" đã được enforce ở app layer
-- (Zod schema trong src/features/recurring/schema.ts), nên ta KHÔNG tạo check
-- constraint ở DB. Trade-off: dữ liệu insert thẳng qua SQL có thể vi phạm,
-- nhưng code path duy nhất đi qua là seed scripts đã được review.
-- =========================================================================

-- Thêm value mới vào enum. Idempotent: skip nếu đã tồn tại.
do $enum$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'recurring_frequency'
      and e.enumlabel = 'every_n_days'
  ) then
    alter type public.recurring_frequency add value 'every_n_days';
  end if;
end
$enum$;

-- Thêm column interval_days (NULL cho các frequency cũ).
-- Check ở column level chỉ validate range (1-365), không tham chiếu enum value.
alter table public.recurring_transactions
  add column if not exists interval_days integer
  check (interval_days is null or (interval_days >= 1 and interval_days <= 365));

comment on column public.recurring_transactions.interval_days is
  'Khoảng cách ngày giữa 2 lần sinh (chỉ dùng khi frequency=''every_n_days'', 1-365). App layer enforce NOT NULL khi frequency=every_n_days.';
