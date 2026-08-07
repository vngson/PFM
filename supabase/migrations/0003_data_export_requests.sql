-- Migration 0003: data_export_requests audit table
-- Phase 03 (PDPD): ghi lại mỗi lần user export data.

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  byte_size int,
  status text not null default 'success',
  ip_hash text,
  user_agent text
);

create index data_export_requests_user_idx
  on public.data_export_requests (user_id, requested_at desc);

alter table public.data_export_requests enable row level security;

create policy "data_export_select_own" on public.data_export_requests
  for select using (auth.uid() = user_id);

create policy "data_export_insert_own" on public.data_export_requests
  for insert with check (auth.uid() = user_id);