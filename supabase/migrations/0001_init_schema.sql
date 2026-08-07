-- =========================================================================
-- 0001_init_schema.sql
-- Khởi tạo schema cho Personal Finance Manager.
-- Chạy trong Supabase SQL Editor hoặc qua `supabase db push`.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — mở rộng auth.users, lưu username + metadata
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  currency_code text not null default 'VND',
  locale text not null default 'vi-VN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ràng buộc: username chỉ chứa a-z, 0-9, underscore, dấu chấm, 3-32 ký tự
  constraint profiles_username_format check (
    username ~ '^[a-z0-9_.]{3,32}$'
  )
);

create index profiles_username_idx on public.profiles (username);

comment on table public.profiles is 'Thông tin mở rộng cho mỗi user — 1-1 với auth.users.';

-- ---------------------------------------------------------------------------
-- 2. CATEGORIES — danh mục thu/chi (icon_name + color cho UI)
-- ---------------------------------------------------------------------------
create type public.category_type as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.category_type not null,
  icon_name text not null,   -- tên icon từ lucide-react, vd: 'Utensils', 'Car'
  color text not null,       -- hex color, vd: '#f97316'
  is_default boolean not null default false, -- đánh dấu category seed mặc định
  sort_order int not null default 0,
  created_at timestamptz not null default now(),

  -- Mỗi user không thể có 2 category trùng tên + cùng loại
  unique (user_id, name, type)
);

create index categories_user_idx on public.categories (user_id, type);

comment on column public.categories.icon_name is 'Tên icon lucide-react (PascalCase) để render ở client.';
comment on column public.categories.color is 'Mã màu hex (vd: #f97316) dùng cho badge và chart.';

-- ---------------------------------------------------------------------------
-- 3. ACCOUNTS — tài khoản (ví tiền, ngân hàng, thẻ tín dụng...)
-- ---------------------------------------------------------------------------
create type public.account_type as enum ('cash', 'bank', 'credit_card', 'e_wallet', 'savings', 'investment', 'other');

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.account_type not null default 'cash',
  currency_code text not null default 'VND',
  initial_balance numeric(18, 2) not null default 0,
  current_balance numeric(18, 2) not null default 0, -- cập nhật qua trigger
  icon_name text,                                   -- icon tùy chọn
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, name)
);

create index accounts_user_idx on public.accounts (user_id) where is_archived = false;

-- ---------------------------------------------------------------------------
-- 4. TRANSACTIONS — giao dịch thu/chi
-- ---------------------------------------------------------------------------
create type public.transaction_type as enum ('income', 'expense', 'transfer');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(18, 2) not null check (amount > 0),
  occurred_at date not null default current_date,
  note text,
  receipt_url text, -- path trong Supabase Storage bucket 'receipts'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

create index transactions_user_account_idx
  on public.transactions (user_id, account_id, occurred_at desc);

create index transactions_user_category_idx
  on public.transactions (user_id, category_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 5. BUDGETS — ngân sách theo category theo tháng
-- ---------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(18, 2) not null check (amount > 0),
  period_month date not null, -- luôn chọn ngày 1 của tháng, vd: 2026-08-01
  created_at timestamptz not null default now(),

  -- Một user chỉ có 1 budget cho 1 category trong 1 tháng
  unique (user_id, category_id, period_month)
);

create index budgets_user_period_idx
  on public.budgets (user_id, period_month);

-- ---------------------------------------------------------------------------
-- 6. RECURRING TRANSACTIONS — giao dịch định kỳ (lương, subscription...)
-- ---------------------------------------------------------------------------
create type public.recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly');

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type public.transaction_type not null,
  amount numeric(18, 2) not null check (amount > 0),
  frequency public.recurring_frequency not null,
  start_date date not null,
  end_date date,
  next_run_at date not null, -- ngày sinh transaction tiếp theo
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  -- Recurring chỉ support income/expense, không hỗ trợ transfer
  constraint recurring_no_transfer check (type <> 'transfer')
);

create index recurring_user_active_idx
  on public.recurring_transactions (user_id, is_active, next_run_at);

-- =========================================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_transactions enable row level security;

-- =========================================================================
-- POLICIES — mỗi user chỉ thấy/sửa data của mình
-- =========================================================================

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- categories
create policy "categories_select_own" on public.categories
  for select using (auth.uid() = user_id);

create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- accounts
create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);

create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);

create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "accounts_delete_own" on public.accounts
  for delete using (auth.uid() = user_id);

-- transactions
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- budgets
create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);

create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);

create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

-- recurring_transactions
create policy "recurring_select_own" on public.recurring_transactions
  for select using (auth.uid() = user_id);

create policy "recurring_insert_own" on public.recurring_transactions
  for insert with check (auth.uid() = user_id);

create policy "recurring_update_own" on public.recurring_transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "recurring_delete_own" on public.recurring_transactions
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- TRIGGER: cập nhật current_balance của account khi có transaction
-- =========================================================================
create or replace function public.apply_transaction_to_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(18, 2);
begin
  if (tg_op = 'INSERT') then
    delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.accounts
       set current_balance = current_balance + delta,
           updated_at = now()
     where id = new.account_id
       and user_id = new.user_id;
    return new;
  elsif (tg_op = 'DELETE') then
    delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.accounts
       set current_balance = current_balance + delta,
           updated_at = now()
     where id = old.account_id
       and user_id = old.user_id;
    return old;
  elsif (tg_op = 'UPDATE') then
    -- Revert transaction cũ
    delta := case when old.type = 'income' then -old.amount else old.amount end;
    update public.accounts
       set current_balance = current_balance + delta
     where id = old.account_id
       and user_id = old.user_id;
    -- Áp dụng transaction mới
    delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.accounts
       set current_balance = current_balance + delta,
           updated_at = now()
     where id = new.account_id
       and user_id = new.user_id;
    return new;
  end if;
  return null;
end;
$$;

create trigger trg_transactions_balance
  after insert or update or delete on public.transactions
  for each row execute function public.apply_transaction_to_balance();

-- =========================================================================
-- TRIGGER: tự động set updated_at
-- =========================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.touch_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- STORAGE: bucket cho ảnh hóa đơn
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Mỗi user chỉ truy cập folder con của user_id (vd: receipts/<user_id>/...)
create policy "receipts_select_own" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_update_own" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "receipts_delete_own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
