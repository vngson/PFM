'use server';

// Server Action cho withdrawal (rút tiền mặt qua ATM).
//
// Flow:
//   1. Validate input qua Zod (source, withdrawal_bank, category, amount, fee, date, note).
//   2. Tìm/tạo cash wallet của user.
//   3. Lookup 3 category theo name (locale-agnostic match):
//        - "Rút tiền ATM"        (expense) — trừ tiền rút thực tế từ ngân hàng rút
//        - "Chuyển tiền"         (expense) — trừ tiền từ source khi source ≠ ngân hàng rút
//        - "Nhận tiền ATM"       (income)  — cộng tiền vào ngân hàng rút khi source ≠ ngân hàng rút
//   4. Insert N transactions trong 1 round-trip. Trigger cập nhật current_balance atomic.
//
// Hai luồng:
//   - Source = withdrawal_bank: 3 giao dịch
//       expense(amount) + expense(fee)  từ source → categories "Rút tiền ATM" + "Phí ATM ..."
//       income(amount)                 vào cash wallet, category null
//
//   - Source ≠ withdrawal_bank: 5 giao dịch
//       expense(amount)   từ source          → category "Chuyển tiền"
//       income(amount)    vào withdrawal_bank → category "Nhận tiền ATM"
//       expense(amount)   từ withdrawal_bank  → category "Rút tiền ATM"
//       expense(fee)      từ withdrawal_bank  → category "Phí ATM ..."
//       income(amount)    vào cash wallet    → category null
//
//   5. Revalidate paths liên quan.

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
async function ensureCashAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Account> {
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

  // Race: 2 tab submit đồng thời có thể insert 2 lần, nhưng unique (user_id, name) chặn tab sau.
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

/**
 * Tìm category theo tên + type. Trả về null nếu chưa seed.
 * Dùng cho các category mặc định do hệ thống tự tạo (Rút tiền ATM, Chuyển tiền, Nhận tiền ATM).
 */
async function findCategoryByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  type: 'income' | 'expense',
): Promise<Pick<Category, 'id'> | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('type', type)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as Pick<Category, 'id'>) : null;
}

export async function createWithdrawal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = withdrawalSchema({
    source_account_required: m.zod_account_required,
    withdrawal_bank_required: m.zod_account_required,
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

  // Validate source account: thuộc user, không archived, không phải cash wallet.
  const { data: source, error: srcErr } = await supabase
    .from('accounts')
    .select('id, type, is_archived, name, currency_code')
    .eq('id', data.source_account_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (srcErr) return { error: srcErr.message };
  if (!source) return { error: m.action_account_err_not_found() };
  if (source.is_archived) return { error: m.action_account_err_archived() };
  if (source.type === 'cash') {
    return { error: m.action_withdrawal_err_source_cash() };
  }

  // Validate withdrawal bank account: thuộc user, không archived, không phải cash wallet,
  // không trùng source (đã cover 2 case: same/cross bank).
  const { data: bank, error: bankErr } = await supabase
    .from('accounts')
    .select('id, type, is_archived, name, currency_code')
    .eq('id', data.withdrawal_bank_account_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (bankErr) return { error: bankErr.message };
  if (!bank) {
    return { fieldErrors: { withdrawal_bank_account_id: [m.action_account_err_not_found()] } };
  }
  if (bank.is_archived) {
    return { fieldErrors: { withdrawal_bank_account_id: [m.action_account_err_archived()] } };
  }
  if (bank.type === 'cash') {
    return {
      fieldErrors: { withdrawal_bank_account_id: [m.action_withdrawal_err_source_cash()] },
    };
  }

  // Validate category phí ATM: là expense của user.
  const { data: feeCategory, error: catErr } = await supabase
    .from('categories')
    .select('id, type')
    .eq('id', data.category_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (catErr) return { error: catErr.message };
  if (!feeCategory || (feeCategory as Pick<Category, 'type'>).type !== 'expense') {
    return { fieldErrors: { category_id: [m.action_withdrawal_err_category_expense()] } };
  }

  // Ensure cash wallet.
  const cashAccount = await ensureCashAccount(supabase, user.id);
  if (cashAccount.id === data.source_account_id || cashAccount.id === data.withdrawal_bank_account_id) {
    return { error: m.action_withdrawal_err_source_cash() };
  }

  // Lookup các category mặc định (chỉ cần khi cross-bank).
  const isSameBank = data.source_account_id === data.withdrawal_bank_account_id;
  let catRutTien: Pick<Category, 'id'> | null = null;
  let catChuyenTien: Pick<Category, 'id'> | null = null;
  let catNhanTien: Pick<Category, 'id'> | null = null;
  if (isSameBank) {
    catRutTien = await findCategoryByName(supabase, user.id, 'Rút tiền ATM', 'expense');
  } else {
    catChuyenTien = await findCategoryByName(supabase, user.id, 'Chuyển tiền', 'expense');
    catRutTien = await findCategoryByName(supabase, user.id, 'Rút tiền ATM', 'expense');
    catNhanTien = await findCategoryByName(supabase, user.id, 'Nhận tiền ATM', 'income');
  }

  const userNote = data.note ?? '';
  const noteAmount = data.amount.toLocaleString('vi-VN');
  const noteFee = data.fee.toLocaleString('vi-VN');

  // Cross-bank check: nếu 1 trong 3 category thiếu → báo lỗi để user seed trước.
  if (!isSameBank && (!catChuyenTien || !catRutTien || !catNhanTien)) {
    return { error: m.action_withdrawal_err_missing_categories() };
  }
  if (isSameBank && !catRutTien) {
    return { error: m.action_withdrawal_err_missing_categories() };
  }

  type TxInsert = {
    user_id: string;
    account_id: string;
    category_id: string | null;
    type: 'income' | 'expense';
    amount: number;
    occurred_at: string;
    note: string | null;
  };

  const rows: TxInsert[] = [];
  const feeNote = userNote ? `${userNote} — Phí ATM ${noteFee}` : `Phí ATM ${noteFee}`;
  const cashNote = userNote
    ? `${userNote} — Rút ${noteAmount}`
    : `Rút tiền mặt ${noteAmount}`;

  if (isSameBank) {
    // 3 tx: trừ rút (bank) + trừ phí (bank) + cộng cash.
    rows.push(
      {
        user_id: user.id,
        account_id: bank.id,
        category_id: catRutTien!.id,
        type: 'expense',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: userNote ? `${userNote} — Rút ${noteAmount}` : `Rút tiền ATM ${noteAmount}`,
      },
      {
        user_id: user.id,
        account_id: bank.id,
        category_id: (feeCategory as Pick<Category, 'id'>).id,
        type: 'expense',
        amount: data.fee,
        occurred_at: data.occurred_at,
        note: feeNote,
      },
      {
        user_id: user.id,
        account_id: cashAccount.id,
        category_id: null,
        type: 'income',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: cashNote,
      },
    );
  } else {
    // 5 tx: chuyển (source→bank) + nhận (bank) + rút (bank) + phí (bank) + cash.
    const bankName = (bank as Pick<Account, 'name'>).name;
    const sourceName = (source as Pick<Account, 'name'>).name;
    rows.push(
      {
        user_id: user.id,
        account_id: source.id,
        category_id: catChuyenTien!.id,
        type: 'expense',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: userNote
          ? `${userNote} — Chuyển sang ${bankName}`
          : `Chuyển sang ${bankName} để rút ATM`,
      },
      {
        user_id: user.id,
        account_id: bank.id,
        category_id: catNhanTien!.id,
        type: 'income',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: userNote
          ? `${userNote} — Nhận từ ${sourceName}`
          : `Nhận chuyển từ ${sourceName}`,
      },
      {
        user_id: user.id,
        account_id: bank.id,
        category_id: catRutTien!.id,
        type: 'expense',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: userNote ? `${userNote} — Rút ${noteAmount}` : `Rút tiền ATM ${noteAmount}`,
      },
      {
        user_id: user.id,
        account_id: bank.id,
        category_id: (feeCategory as Pick<Category, 'id'>).id,
        type: 'expense',
        amount: data.fee,
        occurred_at: data.occurred_at,
        note: feeNote,
      },
      {
        user_id: user.id,
        account_id: cashAccount.id,
        category_id: null,
        type: 'income',
        amount: data.amount,
        occurred_at: data.occurred_at,
        note: cashNote,
      },
    );
  }

  // 1 round-trip insert toàn bộ row → trigger tự cập nhật current_balance atomic.
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

/** Lấy danh sách bank accounts (type='bank' hoặc 'ewallet'/'savings'/..., không phải cash, không archived).
 *  Withdrawal form cho user chọn "ngân hàng rút tiền" từ danh sách này. */
export async function listWithdrawalBankOptions(): Promise<
  Pick<Account, 'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'>[]
> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, currency_code, color, icon_name')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .neq('type', 'cash')
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<
    Account,
    'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'
  >[];
}
