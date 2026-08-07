'use server';

// Server Actions cho recurring_transactions CRUD + manual generate.
// Mọi action: (1) zod re-validate, (2) auth check, (3) RLS enforce tự động.
// `generateFromRecurring`: insert transaction cho kỳ đến hạn, advance next_run_at.

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { recurringSchema } from './schema';
import type { RecurringInput } from './schema';
import { advanceDate, todayIso } from './frequency';
import type { Account, RecurringTransaction, RecurringFrequency } from '@/types/database';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

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

function recurringT() {
  return {
    account_required: m.zod_account_required,
    category_invalid: m.zod_category_invalid,
    transaction_type_required: m.zod_transaction_type_required,
    amount_required: m.zod_amount_required,
    amount_positive: m.zod_recurring_amount_positive,
    frequency_required: m.zod_recurring_frequency_required,
    start_required: m.zod_recurring_start_required,
    date_invalid: m.zod_date_invalid,
    end_invalid: m.zod_recurring_end_invalid,
    note_max: m.zod_note_max,
  };
}

function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

/** Lấy next_run_at đầu tiên cho 1 recurring vừa tạo:
 *  - Nếu start_date <= hôm nay → next_run_at = start_date (đã đến hạn, generate ngay được).
 *  - Nếu start_date > hôm nay → next_run_at = start_date (chờ đến ngày). */
function initialNextRunAt(startDate: string): string {
  return startDate;
}

/** Tính next_run_at dựa trên end_date: nếu next vượt end_date thì trả null để mark inactive. */
function computeNextRunAt(
  current: string,
  frequency: RecurringFrequency,
  endDate: string | null,
): string | null {
  const next = advanceDate(current, frequency);
  if (endDate && next > endDate) return null;
  return next;
}

export async function createRecurring(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recurringSchema(recurringT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: RecurringInput = parsed.data;

  const { error } = await supabase.from('recurring_transactions').insert({
    user_id: user.id,
    account_id: data.account_id,
    category_id: data.category_id ?? null,
    type: data.type,
    amount: data.amount,
    frequency: data.frequency,
    start_date: data.start_date,
    end_date: data.end_date ?? null,
    next_run_at: initialNextRunAt(data.start_date),
    note: data.note ?? null,
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/recurring');
  return null;
}

export async function updateRecurring(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recurringSchema(recurringT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: RecurringInput = parsed.data;

  // Verify ownership
  const { data: existing } = await supabase
    .from('recurring_transactions')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_recurring_err_not_found() };
  }

  const { error } = await supabase
    .from('recurring_transactions')
    .update({
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      type: data.type,
      amount: data.amount,
      frequency: data.frequency,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      note: data.note ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/recurring');
  return null;
}

export async function toggleRecurring(id: string, isActive: boolean): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('recurring_transactions')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/recurring');
}

export async function deleteRecurring(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/recurring');
  revalidatePath('/transactions');
}

/** Lấy tất cả recurring của user (cho list page). */
export async function listRecurring(includeInactive = false): Promise<
  (RecurringTransaction & {
    account: Pick<Account, 'id' | 'name' | 'currency_code' | 'color' | 'icon_name'>;
    category: { id: string; name: string; icon_name: string; color: string; type: 'income' | 'expense' } | null;
  })[]
> {
  const { supabase, user } = await requireUser();

  let q = supabase
    .from('recurring_transactions')
    .select(
      '*, account:accounts(id, name, currency_code, color, icon_name), category:categories(id, name, icon_name, color, type)',
    )
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('next_run_at', { ascending: true });

  if (!includeInactive) {
    q = q.eq('is_active', true);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as never;
}

/** Generate transaction từ 1 rule:
 *  - Nếu next_run_at > today → không sinh (UI phải disable button).
 *  - Insert transaction với occurred_at = next_run_at.
 *  - Advance next_run_at; nếu null thì deactivate rule.
 * Returns: số transaction đã insert (0 hoặc 1) + next_run_at mới. */
export async function generateFromRecurring(
  id: string,
): Promise<{ inserted: number; nextRunAt: string | null }> {
  const { supabase, user } = await requireUser();

  const { data: rule, error: ruleError } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (ruleError || !rule) throw new Error(m.action_recurring_err_not_found());

  const today = todayIso();
  if (rule.next_run_at > today) {
    return { inserted: 0, nextRunAt: rule.next_run_at };
  }
  if (!rule.is_active) {
    return { inserted: 0, nextRunAt: rule.next_run_at };
  }

  // Insert transaction
  const { error: insertError } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: rule.account_id,
    category_id: rule.category_id ?? null,
    type: rule.type,
    amount: Number(rule.amount),
    occurred_at: rule.next_run_at,
    note: rule.note
      ? m.recurring_note_prefix({ note: rule.note })
      : m.recurring_note_prefix({ note: rule.frequency }),
  });
  if (insertError) throw new Error(insertError.message);

  // Advance next_run_at
  const nextRunAt = computeNextRunAt(rule.next_run_at, rule.frequency, rule.end_date);
  const isActive = nextRunAt !== null;
  const { error: updateError } = await supabase
    .from('recurring_transactions')
    .update({ next_run_at: nextRunAt, is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath('/recurring');
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/accounts');

  return { inserted: 1, nextRunAt };
}

/** Bulk: sinh tất cả recurring đang active và có next_run_at <= today.
 *  Dùng cho nút "Sinh tất cả hôm nay" trên list page. */
export async function generateAllDue(): Promise<{ inserted: number; ruleCount: number }> {
  const { supabase, user } = await requireUser();
  const today = todayIso();

  const { data: dueRules } = await supabase
    .from('recurring_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .lte('next_run_at', today);
  if (!dueRules || dueRules.length === 0) return { inserted: 0, ruleCount: 0 };

  let inserted = 0;
  for (const r of dueRules) {
    const res = await generateFromRecurring(r.id);
    inserted += res.inserted;
  }
  return { inserted, ruleCount: dueRules.length };
}
