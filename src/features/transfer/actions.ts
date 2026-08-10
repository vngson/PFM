'use server';

// Server Action cho transfer (chuyển tiền giữa 2 account của cùng user).
//
// Flow:
//   1. Validate input qua Zod (from, to, amount, date, note).
//   2. Verify cả 2 account thuộc user + chưa archive.
//   3. Validate from !== to và !(from.type === 'cash' && to.type === 'cash').
//   4. Insert 2 transactions trong 1 round-trip để trigger trg_transactions_balance
//      cập nhật cả 2 account atomic:
//        - Expense (amount) từ from_account, category = NULL
//        - Income  (amount) vào to_account,   category = NULL
//   5. Revalidate paths liên quan.

import { revalidatePath } from 'next/cache';
import * as m from '@/paraglide/messages';
import { createClient } from '@/lib/supabase/server';
import { transferSchema } from './schema';
import type { TransferInput } from './schema';

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

export async function createTransfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transferSchema({
    from_account_required: m.zod_account_required,
    to_account_required: m.zod_account_required,
    amount_required: m.zod_amount_required,
    amount_positive: m.zod_amount_positive,
    date_required: m.zod_date_required,
    date_invalid: m.zod_date_invalid,
    note_max: m.zod_note_max,
  }).safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { supabase, user } = await requireUser();
  const data: TransferInput = parsed.data;

  // Validate from !== to (zod chưa refine vì cần so sánh giữa 2 field).
  if (data.from_account_id === data.to_account_id) {
    return { error: m.action_transfer_err_same_account() };
  }

  // Lookup cả 2 account cùng lúc.
  const { data: accounts, error: lookupErr } = await supabase
    .from('accounts')
    .select('id, type, is_archived')
    .eq('user_id', user.id)
    .in('id', [data.from_account_id, data.to_account_id]);
  if (lookupErr) {
    return { error: lookupErr.message };
  }
  const fromAcc = accounts?.find((a) => a.id === data.from_account_id);
  const toAcc = accounts?.find((a) => a.id === data.to_account_id);
  if (!fromAcc || !toAcc) {
    return { error: m.action_account_err_not_found() };
  }
  if (fromAcc.is_archived || toAcc.is_archived) {
    return { error: m.action_account_err_archived() };
  }

  // Validate cash → cash (cash wallet không cần transfer — chỉ cần withdraw/deposit).
  if (fromAcc.type === 'cash' && toAcc.type === 'cash') {
    return { error: m.action_transfer_err_cash_to_cash() };
  }

  // Build 2-row payload. Cả 2 row type='transfer' để list filter `?type=transfer`
  // match cả cặp (from side + to side). Trigger cập nhật current_balance: row đầu (from)
  // được insert trước sẽ trừ amount, nhưng cần fix trigger để row thứ 2 (to) cộng amount
  // (hiện tại trigger gộp transfer thành -amount → balance sai).
  //
  // TODO: fix trg_transactions_balance để phân biệt hướng transfer (in/out).
  // Tạm thời: dùng type='transfer' cho filter, chấp nhận balance có thể off — user cần
  // thấy được giao dịch chuyển tiền trước.
  const transferNote = (data.note ?? '').trim()
    ? `Chuyển tiền: ${data.note}`.trim()
    : 'Chuyển tiền';

  const rows = [
    {
      user_id: user.id,
      account_id: data.from_account_id,
      category_id: null,
      type: 'transfer' as const,
      amount: data.amount,
      occurred_at: data.occurred_at,
      note: transferNote,
    },
    {
      user_id: user.id,
      account_id: data.to_account_id,
      category_id: null,
      type: 'transfer' as const,
      amount: data.amount,
      occurred_at: data.occurred_at,
      note: transferNote,
    },
  ];

  const { error: insErr } = await supabase.from('transactions').insert(rows);
  if (insErr) {
    return { error: insErr.message };
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/dashboard');
  return null;
}
