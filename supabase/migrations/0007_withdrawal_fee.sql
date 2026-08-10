-- =========================================================================
-- 0007_withdrawal_fee.sql
-- Thêm cột `withdrawal_fee` vào categories để gắn phí rút tiền mặc định
-- cho từng category phí ATM (vd: Agribank 1100đ/lần, Vietcombank 3300đ/lần).
-- Form rút tiền sẽ auto-fill fee dựa trên category đã chọn — user vẫn có
-- thể override trước khi submit.
-- =========================================================================

-- Idempotent: thêm cột nullable, default null (= category không phải phí ATM).
alter table public.categories
  add column if not exists withdrawal_fee numeric(18, 2) null;

comment on column public.categories.withdrawal_fee is
  'Phí rút tiền mặc định (VND) cho category phí ATM. Null = không phải category phí ATM. Form withdrawal sẽ auto-fill fee này và cho phép user sửa.';

-- Index phụ: giúp form list các category có phí ATM trước (UI withdraw form
-- chỉ hiện category expense có withdrawal_fee IS NOT NULL).
create index if not exists categories_withdrawal_fee_idx
  on public.categories (user_id, type)
  where withdrawal_fee is not null;

-- =========================================================================
-- Cập nhật hàm seed_default_categories_for: thêm field withdrawal_fee vào JSONB
-- để tương thích với schema mới. Default categories cũ có withdrawal_fee = null
-- (vì chúng là chi phí thường, không phải phí ATM). Migration an toàn vì:
--   - Cột mới nullable, default null → insert cũ vẫn chạy.
--   - Hàm seed đã idempotent (ON CONFLICT DO NOTHING) → chạy lại không lỗi.
-- =========================================================================
create or replace function public.seed_default_categories_for(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  defaults jsonb := '[
    {"name": "Ăn uống",            "type": "expense", "icon_name": "Utensils",          "color": "#f97316", "sort_order": 10, "withdrawal_fee": null},
    {"name": "Cà phê",             "type": "expense", "icon_name": "Coffee",            "color": "#92400e", "sort_order": 20, "withdrawal_fee": null},
    {"name": "Di chuyển",          "type": "expense", "icon_name": "Car",               "color": "#3b82f6", "sort_order": 30, "withdrawal_fee": null},
    {"name": "Xăng xe",            "type": "expense", "icon_name": "Fuel",              "color": "#ef4444", "sort_order": 40, "withdrawal_fee": null},
    {"name": "Mua sắm",            "type": "expense", "icon_name": "ShoppingBag",       "color": "#ec4899", "sort_order": 50, "withdrawal_fee": null},
    {"name": "Giải trí",           "type": "expense", "icon_name": "Gamepad2",          "color": "#a855f7", "sort_order": 60, "withdrawal_fee": null},
    {"name": "Hóa đơn & điện",     "type": "expense", "icon_name": "Receipt",           "color": "#f59e0b", "sort_order": 70, "withdrawal_fee": null},
    {"name": "Thuê nhà",           "type": "expense", "icon_name": "Home",              "color": "#0ea5e9", "sort_order": 80, "withdrawal_fee": null},
    {"name": "Sức khỏe",           "type": "expense", "icon_name": "HeartPulse",        "color": "#10b981", "sort_order": 90, "withdrawal_fee": null},
    {"name": "Giáo dục",           "type": "expense", "icon_name": "GraduationCap",     "color": "#6366f1", "sort_order": 100, "withdrawal_fee": null},
    {"name": "Quà tặng & từ thiện","type": "expense", "icon_name": "Gift",              "color": "#f43f5e", "sort_order": 110, "withdrawal_fee": null},
    {"name": "Chi phí khác",       "type": "expense", "icon_name": "MoreHorizontal",    "color": "#64748b", "sort_order": 200, "withdrawal_fee": null},

    {"name": "Lương",              "type": "income",  "icon_name": "Wallet",            "color": "#16a34a", "sort_order": 10, "withdrawal_fee": null},
    {"name": "Thưởng",             "type": "income",  "icon_name": "Trophy",            "color": "#eab308", "sort_order": 20, "withdrawal_fee": null},
    {"name": "Thu nhập phụ",       "type": "income",  "icon_name": "TrendingUp",        "color": "#22c55e", "sort_order": 30, "withdrawal_fee": null},
    {"name": "Thu nhập khác",      "type": "income",  "icon_name": "PlusCircle",        "color": "#64748b", "sort_order": 90, "withdrawal_fee": null}
  ]'::jsonb;
  row jsonb;
begin
  -- Idempotent: chỉ seed nếu user chưa có category nào
  if exists (select 1 from public.categories where user_id = p_user_id) then
    return;
  end if;

  for row in select * from jsonb_array_elements(defaults)
  loop
    insert into public.categories (user_id, name, type, icon_name, color, is_default, sort_order, withdrawal_fee)
    values (
      p_user_id,
      row->>'name',
      (row->>'type')::public.category_type,
      row->>'icon_name',
      row->>'color',
      true,
      (row->>'sort_order')::int,
      (row->>'withdrawal_fee')::numeric
    )
    on conflict (user_id, name, type) do nothing;
  end loop;
end;
$$;
