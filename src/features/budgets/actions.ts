'use server';

// Server Actions cho budgets CRUD + tính spent theo category.
// Mọi action: (1) zod re-validate, (2) auth check, (3) RLS enforce tự động.
// `listBudgetsWithSpent`: join budgets + sum(transactions.amount) theo category_id trong period_month.

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { budgetSchema } from './schema';
import type { BudgetInput } from './schema';
import { monthToPeriod } from './period';
import type { Budget, Category } from '@/types/database';

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

function budgetT() {
  return {
    category_required: m.zod_budget_category_required,
    amount_required: m.zod_amount_required,
    amount_positive: m.zod_budget_amount_positive,
    month_invalid: m.zod_budget_month_invalid,
  };
}

function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

export async function createBudget(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetSchema(budgetT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: BudgetInput = parsed.data;

  const { error } = await supabase.from('budgets').insert({
    user_id: user.id,
    category_id: data.category_id,
    amount: data.amount,
    period_month: data.period_month,
  });

  if (error) {
    // 23505 = unique violation
    if (error.code === '23505') {
      return { error: m.action_budget_err_duplicate() };
    }
    return { error: error.message };
  }

  revalidatePath('/budgets');
  return null;
}

export async function updateBudget(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetSchema(budgetT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: BudgetInput = parsed.data;

  // Verify ownership
  const { data: existing } = await supabase
    .from('budgets')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_budget_err_not_found() };
  }

  const { error } = await supabase
    .from('budgets')
    .update({
      category_id: data.category_id,
      amount: data.amount,
      period_month: data.period_month,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/budgets');
  return null;
}

export async function deleteBudget(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/budgets');
}

export interface BudgetWithSpent extends Budget {
  category: Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'type'>;
  spent: number;
}

/**
 * Lấy budgets của user trong 1 tháng + tổng spent theo category.
 * - Lấy budgets WHERE period_month = monthToPeriod(month).
 * - Sau đó aggregate sum(transactions.amount) cho từng category_id trong tháng đó.
 * - Trả về object gồm spent để render progress bar.
 */
export async function listBudgetsWithSpent(month: string): Promise<BudgetWithSpent[]> {
  const { supabase, user } = await requireUser();
  const period = monthToPeriod(month);
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return [];
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

  // Parallel: budgets + expense transactions trong tháng
  const [budgetsRes, txnsRes] = await Promise.all([
    supabase
      .from('budgets')
      .select(
        '*, category:categories(id, name, icon_name, color, type)',
      )
      .eq('user_id', user.id)
      .eq('period_month', period)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('occurred_at', start)
      .lte('occurred_at', end)
      .not('category_id', 'is', null),
  ]);

  if (budgetsRes.error) throw new Error(budgetsRes.error.message);
  if (txnsRes.error) throw new Error(txnsRes.error.message);

  const spentByCategory = new Map<string, number>();
  for (const t of txnsRes.data ?? []) {
    if (!t.category_id) continue;
    spentByCategory.set(
      t.category_id,
      (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount),
    );
  }

  const rows = (budgetsRes.data ?? []) as BudgetWithSpent[];
  for (const b of rows) {
    b.spent = spentByCategory.get(b.category_id) ?? 0;
  }
  return rows;
}

/** Categories expense để chọn khi tạo budget (filter đúng type expense). */
export async function listExpenseCategoriesForBudget(): Promise<
  Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'type'>[]
> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon_name, color, type')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'type'>[];
}