-- =========================================================================
-- 0002_seed_default_categories.sql
-- Hàm seed ~16 category mặc định (phổ biến cho người Việt) cho user mới.
-- Gọi từ Server Action ngay sau khi signup thành công.
-- =========================================================================

create or replace function public.seed_default_categories_for(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  defaults jsonb := '[
    {"name": "Ăn uống",            "type": "expense", "icon_name": "Utensils",          "color": "#f97316", "sort_order": 10},
    {"name": "Cà phê",             "type": "expense", "icon_name": "Coffee",            "color": "#92400e", "sort_order": 20},
    {"name": "Di chuyển",          "type": "expense", "icon_name": "Car",               "color": "#3b82f6", "sort_order": 30},
    {"name": "Xăng xe",            "type": "expense", "icon_name": "Fuel",              "color": "#ef4444", "sort_order": 40},
    {"name": "Mua sắm",            "type": "expense", "icon_name": "ShoppingBag",       "color": "#ec4899", "sort_order": 50},
    {"name": "Giải trí",           "type": "expense", "icon_name": "Gamepad2",          "color": "#a855f7", "sort_order": 60},
    {"name": "Hóa đơn & điện",     "type": "expense", "icon_name": "Receipt",           "color": "#f59e0b", "sort_order": 70},
    {"name": "Thuê nhà",           "type": "expense", "icon_name": "Home",              "color": "#0ea5e9", "sort_order": 80},
    {"name": "Sức khỏe",           "type": "expense", "icon_name": "HeartPulse",        "color": "#10b981", "sort_order": 90},
    {"name": "Giáo dục",           "type": "expense", "icon_name": "GraduationCap",     "color": "#6366f1", "sort_order": 100},
    {"name": "Quà tặng & từ thiện","type": "expense", "icon_name": "Gift",              "color": "#f43f5e", "sort_order": 110},
    {"name": "Chi phí khác",       "type": "expense", "icon_name": "MoreHorizontal",    "color": "#64748b", "sort_order": 200},

    {"name": "Lương",              "type": "income",  "icon_name": "Wallet",            "color": "#16a34a", "sort_order": 10},
    {"name": "Thưởng",             "type": "income",  "icon_name": "Trophy",            "color": "#eab308", "sort_order": 20},
    {"name": "Thu nhập phụ",       "type": "income",  "icon_name": "TrendingUp",        "color": "#22c55e", "sort_order": 30},
    {"name": "Thu nhập khác",      "type": "income",  "icon_name": "PlusCircle",        "color": "#64748b", "sort_order": 90}
  ]'::jsonb;
  row jsonb;
begin
  -- Idempotent: chỉ seed nếu user chưa có category nào
  if exists (select 1 from public.categories where user_id = p_user_id) then
    return;
  end if;

  for row in select * from jsonb_array_elements(defaults)
  loop
    insert into public.categories (user_id, name, type, icon_name, color, is_default, sort_order)
    values (
      p_user_id,
      row->>'name',
      (row->>'type')::public.category_type,
      row->>'icon_name',
      row->>'color',
      true,
      (row->>'sort_order')::int
    )
    on conflict (user_id, name, type) do nothing;
  end loop;
end;
$$;

comment on function public.seed_default_categories_for(uuid) is
  'Seed bộ category mặc định (idempotent) cho user mới. Gọi từ Server Action sau signup.';
