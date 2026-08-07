-- =========================================================================
-- seed.sql — dữ liệu demo cho PFM
-- Idempotent: chạy nhiều lần không tạo duplicate.
-- Chạy SAU khi đã apply 0001 + 0002 migrations.
-- Dùng user demo với email demo@example.com (UUID cố định để share).
-- =========================================================================

begin;

-- 1. Tạo user demo trong auth.users (chỉ chạy nếu Supabase cho phép; nếu không
--    thì tạo user qua Dashboard rồi lấy id thay vào :demo_user_id bên dưới).
do $$
declare
  demo_email text := 'demo@example.com';
  demo_id uuid := '00000000-0000-0000-0000-000000000001';
  demo_password text := 'DemoPassword123!';
  has_user boolean;
begin
  select exists(select 1 from auth.users where id = demo_id) into has_user;

  if not has_user then
    -- Chèn user + identity. Cryptographic password (md5 chỉ để seed placeholder).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      demo_id,
      'authenticated',
      'authenticated',
      demo_email,
      crypt(demo_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"demo","full_name":"Demo User","currency_code":"VND"}'::jsonb,
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) values (
      gen_random_uuid(),
      demo_id,
      jsonb_build_object('sub', demo_id::text, 'email', demo_email, 'email_verified', true),
      'email',
      demo_id::text,
      now(), now(), now()
    );
  end if;
end $$;

-- 2. Profile (id = user_id, 1-1)
insert into public.profiles (id, username, full_name, currency_code, locale)
values ('00000000-0000-0000-0000-000000000001', 'demo', 'Demo User', 'VND', 'vi-VN')
on conflict (id) do update set
  username = excluded.username,
  full_name = excluded.full_name,
  currency_code = excluded.currency_code;

-- 3. Seed default categories cho demo user (idempotent qua function có sẵn)
select public.seed_default_categories_for('00000000-0000-0000-0000-000000000001');

-- 4. Accounts — xóa accounts cũ (cascade set null cho category nhưng giữ txn riêng)
delete from public.accounts where user_id = '00000000-0000-0000-0000-000000000001';

insert into public.accounts (user_id, name, type, currency_code, initial_balance, current_balance, icon_name, color)
values
  ('00000000-0000-0000-0000-000000000001', 'Ví tiền mặt',     'cash',         'VND', 500000,   500000,   'Wallet',   '#f5d547'),
  ('00000000-0000-0000-0000-000000000001', 'MoMo',            'e_wallet',     'VND', 1500000,  1500000,  'Smartphone', '#ff4d4d'),
  ('00000000-0000-0000-0000-000000000001', 'Vietcombank',     'bank',         'VND', 8000000,  8000000,  'Landmark', '#9b7ede');

-- Lưu account IDs (dùng cho transactions bên dưới)
create temp table _seed_accounts (
  name text primary key,
  id uuid
);
insert into _seed_accounts (name, id)
select name, id from public.accounts
where user_id = '00000000-0000-0000-0000-000000000001';

-- 5. Categories mapping (lưu tạm để bind vào transactions)
create temp table _seed_categories (
  name text,
  type text,
  id uuid
);
insert into _seed_categories (name, type, id)
select name, type::text, id from public.categories
where user_id = '00000000-0000-0000-0000-000000000001';

-- 6. Transactions — 30+ dòng trải 3 tháng (2026-06, 2026-07, 2026-08)
delete from public.transactions where user_id = '00000000-0000-0000-0000-000000000001';

-- Helper: insert transaction with category lookup
create temp table _txn_seed (occurred_at date, account text, type text, amount numeric, category text, note text);
insert into _txn_seed (occurred_at, account, type, amount, category, note) values
  -- 2026-06 (tháng trước)
  ('2026-06-01', 'Vietcombank', 'income',  15000000, 'Lương',           'Lương tháng 6'),
  ('2026-06-02', 'Vietcombank', 'expense',  3500000, 'Thuê nhà',        'Tiền phòng T6'),
  ('2026-06-05', 'Ví tiền mặt','expense',    85000, 'Ăn uống',         'Bún bò sáng'),
  ('2026-06-08', 'Vietcombank', 'expense',  1200000, 'Hóa đơn & điện','Điện + nước + internet'),
  ('2026-06-10', 'MoMo',        'expense',    45000, 'Cà phê',          'Highlands'),
  ('2026-06-12', 'Vietcombank', 'expense',   350000, 'Di chuyển',       'Grab tháng'),
  ('2026-06-15', 'MoMo',        'expense',   290000, 'Xăng xe',         'Đổ xăng'),
  ('2026-06-18', 'MoMo',        'expense',   550000, 'Mua sắm',         'Áo + quần'),
  ('2026-06-20', 'Vietcombank', 'expense',   780000, 'Giải trí',        'PS5 game'),
  ('2026-06-25', 'Vietcombank', 'transfer', 2000000, null,              'Chuyển sang MoMo'),
  ('2026-06-28', 'Vietcombank', 'expense',   450000, 'Sức khỏe',        'Khám tổng quát'),

  -- 2026-07
  ('2026-07-01', 'Vietcombank', 'income',  15000000, 'Lương',           'Lương tháng 7'),
  ('2026-07-02', 'Vietcombank', 'expense',  3500000, 'Thuê nhà',        'Tiền phòng T7'),
  ('2026-07-05', 'Vietcombank', 'transfer', 1000000, null,              'Rút tiền mặt'),
  ('2026-07-06', 'Ví tiền mặt','expense',    95000, 'Ăn uống',         'Phở sáng'),
  ('2026-07-08', 'Ví tiền mặt','expense',    65000, 'Cà phê',          'The Coffee House'),
  ('2026-07-10', 'Vietcombank', 'expense',  1300000, 'Hóa đơn & điện', 'Điện + nước + internet'),
  ('2026-07-12', 'MoMo',        'expense',   180000, 'Ăn uống',         'Trưa với team'),
  ('2026-07-14', 'MoMo',        'expense',   350000, 'Xăng xe',         'Đổ xăng'),
  ('2026-07-18', 'Vietcombank', 'expense',   450000, 'Quà tặng & từ thiện', 'Sinh nhật bạn'),
  ('2026-07-22', 'Vietcombank', 'expense',   890000, 'Mua sắm',         'Giày'),
  ('2026-07-25', 'MoMo',        'income',   1200000, 'Thu nhập phụ',  'Freelance landing page'),
  ('2026-07-28', 'Ví tiền mặt','expense',    75000, 'Ăn uống',         'Bánh mì'),

  -- 2026-08 (tháng hiện tại)
  ('2026-08-01', 'Vietcombank', 'income',  15000000, 'Lương',           'Lương tháng 8'),
  ('2026-08-01', 'Vietcombank', 'expense',  3500000, 'Thuê nhà',        'Tiền phòng T8'),
  ('2026-08-02', 'Vietcombank', 'transfer', 1000000, null,              'Rút tiền mặt sinh hoạt'),
  ('2026-08-03', 'Vietcombank', 'income',   2500000, 'Thưởng',          'Thưởng KPI Q2'),
  ('2026-08-04', 'MoMo',        'expense',   185000, 'Ăn uống',         'Cơm gà'),
  ('2026-08-05', 'Vietcombank', 'expense',  1250000, 'Hóa đơn & điện', 'Điện + nước + internet'),
  ('2026-08-05', 'Vietcombank', 'transfer', 5000000, null,              'Chuyển tiết kiệm'),
  ('2026-08-06', 'Ví tiền mặt','expense',    55000, 'Cà phê',          'Highlands'),
  ('2026-08-07', 'Vietcombank', 'expense',   250000, 'Di chuyển',       'Grab cuối tuần'),
  ('2026-08-08', 'MoMo',        'expense',   320000, 'Xăng xe',         'Đổ xăng'),
  ('2026-08-10', 'Vietcombank', 'expense',  1200000, 'Mua sắm',         'Đồ điện tử'),
  ('2026-08-12', 'MoMo',        'expense',    45000, 'Ăn uống',         'Bánh mì sáng'),
  ('2026-08-13', 'Vietcombank', 'expense',   580000, 'Giáo dục',        'Khóa học online'),
  ('2026-08-15', 'MoMo',        'expense',   320000, 'Ăn uống',         'Lẩu tối cuối tuần'),
  ('2026-08-16', 'Vietcombank', 'transfer', 5000000, null,              'Chuyển tiết kiệm tháng 8'),
  ('2026-08-18', 'Vietcombank', 'expense',   320000, 'Sức khỏe',        'Mua thuốc');

insert into public.transactions (user_id, account_id, category_id, type, amount, occurred_at, note)
select
  '00000000-0000-0000-0000-000000000001',
  acc.id,
  cat.id,
  s.type::public.transaction_type,
  s.amount,
  s.occurred_at,
  s.note
from _txn_seed s
join _seed_accounts acc on acc.name = s.account
left join _seed_categories cat on cat.name = s.category and cat.type = s.type;

drop table _txn_seed;
drop table _seed_accounts;
drop table _seed_categories;

commit;

-- =========================================================================
-- Verify
-- =========================================================================
select 'profiles' as table, count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000001'
union all
select 'accounts', count(*) from public.accounts where user_id = '00000000-0000-0000-0000-000000000001'
union all
select 'categories', count(*) from public.categories where user_id = '00000000-0000-0000-0000-000000000001'
union all
select 'transactions', count(*) from public.transactions where user_id = '00000000-0000-0000-0000-000000000001'
union all
select 'txns_income', count(*) from public.transactions where user_id = '00000000-0000-0000-0000-000000000001' and type = 'income'
union all
select 'txns_expense', count(*) from public.transactions where user_id = '00000000-0000-0000-0000-000000000001' and type = 'expense'
union all
select 'txns_transfer', count(*) from public.transactions where user_id = '00000000-0000-0000-0000-000000000001' and type = 'transfer';
