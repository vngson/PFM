'use server';

// Server Actions cho accounts CRUD.
// Mọi action đều: (1) re-validate zod, (2) check user đăng nhập, (3) RLS enforce tự động.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import { accountSchema } from './schema';
import type { AccountInput } from './schema';
import type { Account } from '@/types/database';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

/** Helper: lấy user hiện tại hoặc throw. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error(m.common_unauthorized());
  }
  return { supabase, user };
}

/** Parse FormData thành object string (zod sẽ transform). */
function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountSchema({
    account_name_required: m.zod_account_name_required,
    account_name_max: m.zod_account_name_max,
    account_type_required: m.zod_account_type_required,
    currency_min: m.zod_currency_min,
    currency_max: m.zod_currency_max,
    initial_balance_required: m.zod_initial_balance_required,
    initial_balance_nonneg: m.zod_initial_balance_nonneg,
    color_hex: m.zod_color_hex,
  }).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: AccountInput = parsed.data;

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: data.name,
    type: data.type,
    currency_code: data.currency_code,
    initial_balance: data.initial_balance,
    current_balance: data.initial_balance, // ban đầu = initial
    color: data.color,
    icon_name: data.icon_name || null,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: m.action_account_err_duplicate_create() };
    }
    return { error: error.message };
  }

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return null;
}

export async function updateAccount(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountSchema({
    account_name_required: m.zod_account_name_required,
    account_name_max: m.zod_account_name_max,
    account_type_required: m.zod_account_type_required,
    currency_min: m.zod_currency_min,
    currency_max: m.zod_currency_max,
    initial_balance_required: m.zod_initial_balance_required,
    initial_balance_nonneg: m.zod_initial_balance_nonneg,
    color_hex: m.zod_color_hex,
  }).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: AccountInput = parsed.data;

  // Verify ownership trước khi update (RLS cũng check, nhưng check tường minh để có error rõ ràng).
  const { data: existing } = await supabase
    .from('accounts')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_account_err_not_found() };
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      name: data.name,
      type: data.type,
      currency_code: data.currency_code,
      color: data.color,
      icon_name: data.icon_name || null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: m.action_account_err_duplicate_update() };
    }
    return { error: error.message };
  }

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return null;
}

export async function archiveAccount(id: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  redirect(buildLocalizedHref('/accounts', getLocale()));
}

export async function deleteAccount(id: string): Promise<void> {
  const { supabase, user } = await requireUser();

  // FK là restrict — sẽ fail nếu còn transaction. UI sẽ hiện error thân thiện.
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === '23503') {
      throw new Error(m.action_account_err_delete_blocked());
    }
    throw new Error(error.message);
  }

  revalidatePath('/accounts');
  revalidatePath('/dashboard');
}

/** Lấy danh sách account của user (server-only). */
export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const { supabase, user } = await requireUser();
  let q = supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });
  if (!includeArchived) {
    q = q.eq('is_archived', false);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}
