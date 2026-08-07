'use server';

// Server Actions cho settings: update profile + change password +
// list sessions + sign out other sessions.

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { profileSchema, passwordSchema } from './schema';
import { buildExportPayload, shouldRateLimit } from '@/lib/export/payload-builder';
import type { ExportPayload } from '@/lib/export/payload-builder';

export type SettingsActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
} | null;

function settingsT() {
  return {
    username_min: m.zod_username_min,
    username_max: m.zod_username_max,
    username_charset: m.zod_username_charset,
    display_name_max: m.zod_display_name_max,
    current_password_required: m.zod_current_password_required,
    password_min: m.zod_password_min,
    password_max: m.zod_password_max,
    password_confirm_required: m.zod_password_confirm_required,
    password_confirm_mismatch: m.zod_password_confirm_mismatch,
    password_same_as_current: m.zod_password_same_as_current,
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(m.common_unauthorized());
  return { supabase, user };
}

function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

export async function updateProfile(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = profileSchema(settingsT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { supabase, user } = await requireUser();
  const data = parsed.data;

  const { error } = await supabase
    .from('profiles')
    .update({
      username: data.username,
      full_name: data.full_name || null,
      currency_code: data.currency_code,
      locale: data.locale,
    })
    .eq('id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: m.auth_err_username_taken() };
    }
    return { error: error.message };
  }

  // Cập nhật user_metadata để login/signup flow mới dùng đúng currency/locale
  await supabase.auth.updateUser({
    data: {
      currency_code: data.currency_code,
      locale: data.locale,
    },
  });

  revalidatePath('/settings');
  revalidatePath('/', 'layout');
  return { success: m.settings_profile_saved() };
}

export async function changePassword(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = passwordSchema(settingsT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { supabase } = await requireUser();
  const { current, next } = parsed.data;

  // Supabase yêu cầu re-auth trước khi đổi mật khẩu. Flow đơn giản:
  // dùng updateUser({ password }) — Supabase sẽ fail nếu session yếu.
  // Để bảo mật hơn, có thể check current qua signInWithPassword ở 1 action riêng.
  const { error: verifyError } = await supabase.rpc('verify_user_password', {
    p_password: current,
  });
  if (verifyError) {
    // Fallback nếu RPC không tồn tại: thử signInWithPassword
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
      password: current,
    });
    if (signInError) {
      return { error: m.auth_err_current_password_wrong() };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return { error: error.message };
  }

  return { success: m.settings_password_changed() };
}

export interface SessionInfo {
  id: string;
  is_current: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  user_agent: string | null;
  ip: string | null;
}

export async function listSessions(): Promise<SessionInfo[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return [];
  const s = data.session;
  const now = new Date().toISOString();
  return [
    {
      id: s.access_token.slice(-12),
      is_current: true,
      created_at: user.created_at ?? now,
      last_sign_in_at: now,
      user_agent: null,
      ip: null,
    },
  ];
}

export async function signOutOtherSessions(): Promise<SettingsActionState> {
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) {
    return { error: error.message };
  }
  revalidatePath('/settings');
  return { success: m.settings_signout_other_success() };
}

// Phase 23: export toàn bộ data của user dưới dạng JSON.
// Gồm: profile + accounts + categories + transactions + recurring + budgets.
// Phase 03 (PDPD): thêm schema_version, app_version, byte_size + rate limit 1/h + audit log.
export type { ExportPayload } from '@/lib/export/payload-builder';

export async function exportAllData(): Promise<ExportPayload | null> {
  const { supabase, user } = await requireUser();

  // Rate limit: 1 export / hour / user
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentExports } = await supabase
    .from('data_export_requests')
    .select('requested_at')
    .eq('user_id', user.id)
    .gte('requested_at', oneHourAgo);

  if (shouldRateLimit(recentExports ?? [], Date.now())) {
    throw new Error(m.settings_export_rate_limit());
  }

  // Parallel fetch all tables (RLS already scoped to user_id).
  const [profile, accounts, categories, transactions, recurring, budgets] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id),
      supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
      supabase.from('budgets').select('*').eq('user_id', user.id),
    ]);

  const payload = buildExportPayload(
    user.id,
    user.email ?? '',
    {
      profile: profile.data,
      accounts: accounts.data ?? [],
      categories: categories.data ?? [],
      transactions: transactions.data ?? [],
      recurring: recurring.data ?? [],
      budgets: budgets.data ?? [],
    },
  );

  // Audit log
  await supabase.from('data_export_requests').insert({
    user_id: user.id,
    byte_size: payload.byte_size,
    status: 'success',
  });

  return payload;
}

// Phase 04 (PDPD): deleteAccount cũ bị thay thế bằng requestAccountDeletion
// trong auth/account-actions.ts (soft delete + grace period).
// Giữ stub import-tránh để backward compat với tests nếu có.
export {};
