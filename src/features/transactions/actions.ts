'use server';

// Server Actions cho transactions CRUD + helpers (summary, accounts list cho form).
// Mọi action đều: (1) re-validate zod, (2) check user đăng nhập, (3) RLS enforce tự động.
// Note: account.current_balance cập nhật tự động qua trigger trg_transactions_balance.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { transactionSchema } from './schema';
import type { TransactionInput } from './schema';
import type { Account, Transaction } from '@/types/database';
import type { Category } from '@/types/database';

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

function transactionT() {
  return {
    account_required: m.zod_account_required,
    category_invalid: m.zod_category_invalid,
    transaction_type_required: m.zod_transaction_type_required,
    amount_required: m.zod_amount_required,
    amount_positive: m.zod_amount_positive,
    date_required: m.zod_date_required,
    date_invalid: m.zod_date_invalid,
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

/** Lấy list account active của user — dùng cho dropdown trong form và tên hiển thị trong list. */
export async function listActiveAccounts(): Promise<Pick<Account, 'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'>[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, currency_code, color, icon_name')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Account, 'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'>[];
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transactionSchema(transactionT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: TransactionInput = parsed.data;

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: data.account_id,
    category_id: data.category_id ?? null,
    type: data.type,
    amount: data.amount,
    occurred_at: data.occurred_at,
    note: data.note ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/accounts');
  return null;
}

export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transactionSchema(transactionT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: TransactionInput = parsed.data;

  // Verify ownership (RLS cũng check, nhưng check tường minh cho error rõ ràng).
  const { data: existing } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_txn_err_not_found() };
  }

  const { error } = await supabase
    .from('transactions')
    .update({
      account_id: data.account_id,
      category_id: data.category_id ?? null,
      type: data.type,
      amount: data.amount,
      occurred_at: data.occurred_at,
      note: data.note ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/accounts');
  return null;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  revalidatePath('/accounts');
}

interface ListFilters {
  month?: string; // YYYY-MM; nếu thiếu thì tất cả
  account_id?: string;
  category_id?: string;
  /** Filter theo loại giao dịch */
  type?: Transaction['type'];
  /** Tìm theo note (case-insensitive, partial match) */
  q?: string;
  /** Cursor pagination: chỉ lấy txns occurred_at < before */
  before?: string; // YYYY-MM-DD
  limit?: number;
}

export interface TransactionListResult {
  rows: (Transaction & {
    account: Pick<Account, 'id' | 'name' | 'currency_code' | 'color' | 'icon_name'>;
    category: Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'type'> | null;
  })[];
  /** Có còn txns cũ hơn `before` không? */
  hasMore: boolean;
}

/** Lấy danh sách transaction của user, có thể filter theo tháng / account / category / type / search / cursor. */
export async function listTransactions(
  filters: ListFilters = {},
): Promise<TransactionListResult> {
  const { supabase, user } = await requireUser();
  const limit = filters.limit ?? 50;

  let q = supabase
    .from('transactions')
    .select(
      '*, account:accounts(id, name, currency_code, color, icon_name), category:categories(id, name, icon_name, color, type)',
    )
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 để detect hasMore

  if (filters.month) {
    // month = 'YYYY-MM' → khoảng [YYYY-MM-01, YYYY-MM-last]
    const [y, m] = filters.month.split('-').map(Number);
    if (y && m) {
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
      q = q.gte('occurred_at', start).lte('occurred_at', end);
    }
  }
  if (filters.account_id) q = q.eq('account_id', filters.account_id);
  if (filters.category_id) q = q.eq('category_id', filters.category_id);
  if (filters.type) q = q.eq('type', filters.type);
  if (filters.before) q = q.lt('occurred_at', filters.before);
  if (filters.q && filters.q.trim()) {
    // ilike trên note; % là wildcard, %q% chứa q. Supabase không escape %/_ → dùng raw.
    const escaped = filters.q.trim().replace(/[%_]/g, (c) => `\\${c}`);
    q = q.ilike('note', `%${escaped}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as never[]).slice(0, limit);
  return { rows, hasMore: (data ?? []).length > limit };
}

export type TransactionSummary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  count: number;
  byCurrency: Record<string, { income: number; expense: number; net: number; count: number }>;
};

/** Tính tổng thu/chi theo tháng, group theo currency (vì user có thể có nhiều loại tiền). */
export async function getMonthSummary(month: string): Promise<TransactionSummary> {
  const { supabase, user } = await requireUser();

  const [y, m] = month.split('-').map(Number);
  if (!y || !m) {
    return { month, income: 0, expense: 0, net: 0, count: 0, byCurrency: {} };
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, account:accounts(currency_code)')
    .eq('user_id', user.id)
    .gte('occurred_at', start)
    .lte('occurred_at', end);

  if (error) throw new Error(error.message);

  const byCurrency: Record<string, { income: number; expense: number; net: number; count: number }> = {};
  let totalIncome = 0;
  let totalExpense = 0;
  let totalCount = 0;

  for (const row of data ?? []) {
    const code = (row as never as { account: { currency_code: string } }).account?.currency_code ?? 'VND';
    if (!byCurrency[code]) byCurrency[code] = { income: 0, expense: 0, net: 0, count: 0 };
    const bucket = byCurrency[code]!;
    bucket.count += 1;
    totalCount += 1;
    if (row.type === 'income') {
      bucket.income += Number(row.amount);
      totalIncome += Number(row.amount);
    } else if (row.type === 'expense') {
      bucket.expense += Number(row.amount);
      totalExpense += Number(row.amount);
    }
    bucket.net = bucket.income - bucket.expense;
  }

  return {
    month,
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
    count: totalCount,
    byCurrency,
  };
}

/** Lấy danh sách category của user — dùng cho dropdown trong form. */
export async function listCategoriesForSelect(): Promise<
  Pick<Category, 'id' | 'name' | 'type' | 'icon_name' | 'color'>[]
> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, icon_name, color')
    .eq('user_id', user.id)
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Category, 'id' | 'name' | 'type' | 'icon_name' | 'color'>[];
}
