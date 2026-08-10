'use server';

// Server Actions cho recurring_transactions CRUD + manual generate.
// Mọi action: (1) zod re-validate, (2) auth check, (3) RLS enforce tự động.
// `generateFromRecurring`: insert transaction cho kỳ đến hạn, advance next_run_at.
// `getOccurrencesForMonth`: query occurrences của 1 tháng (YYYY-MM) cho calendar view.

import { revalidatePath } from 'next/cache';
import { getRecurringOccurrences } from './calendar';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { recurringSchema } from './schema';
import type { RecurringInput } from './schema';
import { advanceDate, todayIso } from './frequency';
import type { Account, RecurringTransaction, RecurringFrequency } from '@/types/database';

/** Marker phát hiện rule compound interest 4%/năm. Đặt trong note suffix.
 *  Nếu sau này có rate khác (vd 5%/năm), đổi sang regex /(\d+)%\/năm$/. */
const COMPOUND_INTEREST_MARKER = '(4%/năm)';

/** Tính lãi ngày từ balance hiện tại, round về VND nguyên. */
function computeDailyInterest(currentBalance: number): number {
  return Math.round((currentBalance ?? 0) * 0.04 / 365);
}

/** Nếu rule là compound interest, UPDATE amount theo balance mới. Trả về rule
 *  sau khi refresh (để phần insert bên dưới dùng amount mới). Idempotent: skip
 *  nếu newAmount === rule.amount hoặc balance quá nhỏ (newAmount = 0). */
async function refreshCompoundInterestAmount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rule: RecurringTransaction,
): Promise<RecurringTransaction> {
  if (!rule.note?.endsWith(COMPOUND_INTEREST_MARKER)) return rule;

  const { data: acc } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', rule.account_id)
    .single();
  if (!acc) return rule;

  const newAmount = computeDailyInterest(acc.current_balance);
  if (newAmount <= 0 || newAmount === rule.amount) return rule;

  const { error } = await supabase
    .from('recurring_transactions')
    .update({ amount: newAmount })
    .eq('id', rule.id);
  if (error) throw new Error(error.message);

  return { ...rule, amount: newAmount };
}

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
    interval_required: m.zod_recurring_interval_required,
    interval_range: m.zod_recurring_interval_range,
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
  intervalDays: number | null,
): string | null {
  const next = advanceDate(current, frequency, intervalDays);
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
    interval_days: data.frequency === 'every_n_days' ? data.interval_days ?? null : null,
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

  // Verify ownership + fetch current state to detect rebase.
  const { data: existing } = await supabase
    .from('recurring_transactions')
    .select('user_id, start_date, next_run_at, is_active')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_recurring_err_not_found() };
  }

  // Nếu user kéo start_date mới và rule chưa fire (next_run_at vẫn trùng
  // start_date cũ), rebase next_run_at theo start_date mới. Nếu đã fire rồi
  // (next_run_at > start_date cũ) thì giữ nguyên — không tua lịch sử.
  const startDateChanged = existing.start_date !== data.start_date;
  const hasNotFiredYet =
    existing.next_run_at === existing.start_date || existing.next_run_at <= existing.start_date;
  const nextRunAt =
    startDateChanged && hasNotFiredYet ? data.start_date : undefined;

  const { error } = await supabase
    .from('recurring_transactions')
    .update({
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      type: data.type,
      amount: data.amount,
      frequency: data.frequency,
      interval_days: data.frequency === 'every_n_days' ? data.interval_days ?? null : null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      note: data.note ?? null,
      ...(nextRunAt ? { next_run_at: nextRunAt } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/recurring');
  if (nextRunAt) revalidatePath('/transactions');
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

  // Refresh amount cho compound interest rules (4%/năm) trước khi insert.
  const effectiveRule = await refreshCompoundInterestAmount(supabase, rule);

  // Insert transaction
  const { error: insertError } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: effectiveRule.account_id,
    category_id: effectiveRule.category_id ?? null,
    type: effectiveRule.type,
    amount: Number(effectiveRule.amount),
    occurred_at: effectiveRule.next_run_at,
    note: effectiveRule.note
      ? m.recurring_note_prefix({ note: effectiveRule.note })
      : m.recurring_note_prefix({ note: effectiveRule.frequency }),
  });
  if (insertError) throw new Error(insertError.message);

  // Advance next_run_at
  const nextRunAt = computeNextRunAt(
    rule.next_run_at,
    rule.frequency,
    rule.end_date,
    rule.interval_days,
  );
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

/** Wrapper cho calendar view: fetch occurrences của 1 tháng (YYYY-MM).
 *  Validate input để chặn injection / malformed payload. */
export async function getOccurrencesForMonth(
  month: string,
): Promise<Awaited<ReturnType<typeof getRecurringOccurrences>>> {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  return getRecurringOccurrences(month);
}
