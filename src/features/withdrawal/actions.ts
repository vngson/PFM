'use server';

// Server Action cho withdrawal (rút tiền mặt từ ATM).
//
// Flow:
//   1. Validate input qua Zod (source_account, category, amount, fee, date, note).
//   2. Tìm cash wallet của user. Nếu chưa có → auto-create với name "Ví tiền mặt",
//      currency VND, initial/current_balance = 0.
//   3. Insert 2 transactions trong 1 round-trip để trigger trg_transactions_balance
//      cập nhật cả 2 account atomic:
//        - Expense (amount + fee) từ source_account, category = ATM fee category
//        - Income  (amount)         vào cash wallet,  category = NULL
//   4. Revalidate paths liên quan (transactions, accounts, dashboard).

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { withdrawalSchema } from './schema';
import type { WithdrawalInput } from './schema';
import type { Account, Category } from '@/types/database';

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

function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

const CASH_WALLET_NAME = 'Ví tiền mặt';

/** Tìm cash wallet (type='cash', chưa archive). Nếu chưa có thì tạo mới với balance 0. */
async function ensureCashAccount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Account> {
  const { data: existing, error: selErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'cash')
    .eq('is_archived', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existing) return existing as Account;

  // Chưa có cash wallet → auto-create. Race condition: nếu 2 tab submit đồng thời
  // thì có thể insert 2 lần, nhưng unique (user_id, name) sẽ chặn tab sau.
  const { data: created, error: insErr } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: CASH_WALLET_NAME,
      type: 'cash',
      currency_code: 'VND',
      initial_balance: 0,
      current_balance: 0,
      icon_name: 'Wallet',
      color: '#f5d547',
    })
    .select('*')
    .single();
  if (insErr) {
    // Trường hợp race: tab khác vừa tạo → select lại.
    if (insErr.code === '23505') {
      const { data: reread, error: rerr } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('name', CASH_WALLET_NAME)
        .eq('type', 'cash')
        .single();
      if (rerr || !reread) throw new Error(rerr?.message ?? m.action_account_err_not_found());
      return reread as Account;
    }
    throw new Error(insErr.message);
  }
  return created as Account;
}

export async function createWithdrawal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = withdrawalSchema({
    source_account_required: m.zod_account_required,
    category_required: m.zod_category_required,
    amount_required: m.zod_amount_required,
    amount_positive: m.zod_amount_positive,
    fee_required: m.zod_fee_required,
    fee_nonneg: m.zod_fee_nonneg,
    date_required: m.zod_date_required,
    date_invalid: m.zod_date_invalid,
    note_max: m.zod_note_max,
  }).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: WithdrawalInput = parsed.data;

  // Source account phải thuộc user + không archived + khác cash wallet (cash wallet
  // là destination, không cho phép rút từ chính cash).
  const { data: source, error: srcErr } = await supabase
    .from('accounts')
    .select('id, type, is_archived')
    .eq('id', data.source_account_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (srcErr) {
    return { error: srcErr.message };
  }
  if (!source) {
    return { error: m.action_account_err_not_found() };
  }
  if (source.is_archived) {
    return { error: m.action_account_err_archived() };
  }
  if (source.type === 'cash') {
    return { error: m.action_withdrawal_err_source_cash() };
  }

  // Category phải là expense của user.
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', data.category_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (catErr) {
    return { error: catErr.message };
  }
  if (!category || (category as Pick<Category, 'type'>).type !== 'expense') {
    return { fieldErrors: { category_id: [m.action_withdrawal_err_category_expense()] } };
  }

  // Tìm/tạo cash wallet.
  const cashAccount = await ensureCashAccount(supabase, user.id);
  if (cashAccount.id === data.source_account_id) {
    return { error: m.action_withdrawal_err_source_cash() };
  }

  const total = data.amount + data.fee;
  const noteSuffix = data.fee > 0
    ? ` — Rút ${data.amount.toLocaleString('vi-VN')} + phí ${data.fee.toLocaleString('vi-VN')}`
    : ` — Rút ${data.amount.toLocaleString('vi-VN')}`;
  const expenseNote = (data.note ?? '') + noteSuffix;

  const rows = [
    {
      user_id: user.id,
      account_id: data.source_account_id,
      category_id: data.category_id,
      type: 'expense' as const,
      amount: total,
      occurred_at: data.occurred_at,
      note: expenseNote.trim() || null,
    },
    {
      user_id: user.id,
      account_id: cashAccount.id,
      category_id: null,
      type: 'income' as const,
      amount: data.amount,
      occurred_at: data.occurred_at,
      note: data.note ?? null,
    },
  ];

  // 1 round-trip insert cả 2 row → trigger tự cập nhật current_balance cho cả 2 account.
  const { error: insErr } = await supabase.from('transactions').insert(rows);
  if (insErr) {
    return { error: insErr.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return null;
}

/** Lấy danh sách category phí ATM (expense có withdrawal_fee IS NOT NULL). */
export async function listAtmFeeCategories(): Promise<
  Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'withdrawal_fee'>[]
> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon_name, color, withdrawal_fee')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .not('withdrawal_fee', 'is', null)
    .order('withdrawal_fee', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'withdrawal_fee'>[];
}
