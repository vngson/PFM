-- Migration 0005: consent_records audit table.
-- Phase 05 (PDPD): ghi lại mỗi lần user đồng ý (signup + future policy updates).
-- Immutable audit trail — chỉ SELECT cho user, INSERT qua service_role.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (
    consent_type in ('terms_and_privacy', 'marketing_emails', 'analytics_tracking')
  ),
  policy_version text not null,
  granted_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  unique (user_id, consent_type, policy_version)
);

create index consent_records_user_idx
  on public.consent_records (user_id, granted_at desc);

alter table public.consent_records enable row level security;

create policy "consent_select_own" on public.consent_records
  for select using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy — service_role only.
-- Server action `signupAction` chèn row qua admin client (SUPABASE_SERVICE_ROLE_KEY).