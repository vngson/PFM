-- Migration 0004: soft delete + 30-day grace period.
-- Phase 04 (PDPD): user yêu cầu xóa account → set deleted_at + scheduled_purge_at.
-- RLS FULL LOCKOUT: SELECT/UPDATE/INSERT/DELETE đều filter deleted_at IS NULL.
-- pg_cron chạy daily để DELETE auth.users sau grace period.

-- =========================================================================
-- 1. Add columns
-- =========================================================================
alter table public.profiles
  add column if not exists deleted_at timestamptz,
  add column if not exists scheduled_purge_at timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at, scheduled_purge_at)
  where deleted_at is not null;

-- =========================================================================
-- 2. Update RLS — full lockout (SELECT + UPDATE + INSERT + DELETE)
-- =========================================================================

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id and deleted_at is null);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id and deleted_at is null)
  with check (auth.uid() = id and deleted_at is null);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id and deleted_at is null);

-- accounts (RLS check qua profiles: user bị soft-delete thì accounts cũng bị ẩn)
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = accounts.user_id
        and profiles.deleted_at is null
    )
  );

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = accounts.user_id
        and profiles.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own" on public.accounts
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = accounts.user_id
        and profiles.deleted_at is null
    )
  );

-- categories
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = categories.user_id
        and profiles.deleted_at is null
    )
  );

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = categories.user_id
        and profiles.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = categories.user_id
        and profiles.deleted_at is null
    )
  );

-- transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = transactions.user_id
        and profiles.deleted_at is null
    )
  );

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = transactions.user_id
        and profiles.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = transactions.user_id
        and profiles.deleted_at is null
    )
  );

-- budgets
drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = budgets.user_id
        and profiles.deleted_at is null
    )
  );

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = budgets.user_id
        and profiles.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = budgets.user_id
        and profiles.deleted_at is null
    )
  );

-- recurring_transactions
drop policy if exists "recurring_select_own" on public.recurring_transactions;
create policy "recurring_select_own" on public.recurring_transactions
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = recurring_transactions.user_id
        and profiles.deleted_at is null
    )
  );

drop policy if exists "recurring_update_own" on public.recurring_transactions;
create policy "recurring_update_own" on public.recurring_transactions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = recurring_transactions.user_id
        and profiles.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);

drop policy if exists "recurring_insert_own" on public.recurring_transactions;
create policy "recurring_insert_own" on public.recurring_transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "recurring_delete_own" on public.recurring_transactions;
create policy "recurring_delete_own" on public.recurring_transactions
  for delete using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where profiles.id = recurring_transactions.user_id
        and profiles.deleted_at is null
    )
  );

-- =========================================================================
-- 3. Storage cleanup trigger (khi hard-delete auth.user → xóa receipts)
-- =========================================================================
create or replace function public.purge_user_storage()
returns trigger as $$
begin
  delete from storage.objects
  where bucket_id = 'receipts'
    and (storage.foldername(name))[1] = old.id::text;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists before_delete_user_storage on auth.users;
create trigger before_delete_user_storage
  before delete on auth.users
  for each row execute function public.purge_user_storage();

-- =========================================================================
-- 4. Manual cron (cần pg_cron enabled). Run trong Supabase SQL Editor.
-- =========================================================================
-- select cron.schedule(
--   'purge-deleted-accounts',
--   '0 2 * * *',
--   $$
--     delete from auth.users
--     where id in (
--       select id from public.profiles
--       where deleted_at is not null
--         and scheduled_purge_at < now()
--     )
--   $$
-- );