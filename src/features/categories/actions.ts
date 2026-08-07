'use server';

// Server Actions cho categories CRUD.

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { categorySchema } from './schema';
import type { CategoryInput } from './schema';
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

function categoryT() {
  return {
    category_name_required: m.zod_category_name_required,
    category_name_max: m.zod_category_name_max,
    category_type_required: m.zod_category_type_required,
    icon_required: m.zod_icon_required,
    icon_max: m.zod_icon_max,
    color_hex: m.zod_color_hex,
    sort_order_nonneg: m.zod_sort_order_nonneg,
  };
}

function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === 'string') obj[k] = v;
  }
  return obj;
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema(categoryT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: CategoryInput = parsed.data;

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: data.name,
    type: data.type,
    icon_name: data.icon_name,
    color: data.color,
    sort_order: data.sort_order ?? 0,
    is_default: false,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: m.action_category_err_duplicate_create() };
    }
    return { error: error.message };
  }

  revalidatePath('/categories');
  revalidatePath('/dashboard');
  return null;
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema(categoryT()).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: CategoryInput = parsed.data;

  const { data: existing } = await supabase
    .from('categories')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!existing || existing.user_id !== user.id) {
    return { error: m.action_category_err_not_found() };
  }

  const { error } = await supabase
    .from('categories')
    .update({
      name: data.name,
      type: data.type,
      icon_name: data.icon_name,
      color: data.color,
      sort_order: data.sort_order ?? 0,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === '23505') {
      return { error: m.action_category_err_duplicate_update() };
    }
    return { error: error.message };
  }

  revalidatePath('/categories');
  revalidatePath('/dashboard');
  return null;
}

export async function deleteCategory(id: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === '23503') {
      throw new Error(m.action_category_err_delete_blocked());
    }
    throw new Error(error.message);
  }

  revalidatePath('/categories');
  revalidatePath('/dashboard');
}

export async function listCategories(): Promise<Category[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export interface CategoryUsage {
  category_id: string;
  txn_count: number;
  budget_count: number;
  recurring_count: number;
}

/** Đếm usages của 1 category (transactions + budgets + recurring) để cảnh báo trước khi xoá. */
export async function countCategoryUsage(
  categoryId: string,
): Promise<{ txn: number; budget: number; recurring: number }> {
  const { supabase, user } = await requireUser();
  const [txns, budgets, recurring] = await Promise.all([
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_id', categoryId),
    supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_id', categoryId),
    supabase
      .from('recurring_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('category_id', categoryId),
  ]);
  return {
    txn: txns.count ?? 0,
    budget: budgets.count ?? 0,
    recurring: recurring.count ?? 0,
  };
}
