'use server';

// CSV export actions cho transactions, accounts, categories.
// Trả về CSV string (BOM + UTF-8) + filename. Client sẽ tạo Blob và trigger download.

import { createClient } from '@/lib/supabase/server';
import * as m from '@/paraglide/messages';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Escape nếu chứa comma, quote, newline hoặc CR
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  // BOM + CRLF cho Excel
  return '﻿' + lines.join('\r\n');
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface ExportResult {
  filename: string;
  content: string;
}

export async function exportTransactionsCSV(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('transactions')
    .select(
      'occurred_at, type, amount, note, account:accounts(name, currency_code), category:categories(name)',
    )
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((t) => {
    const acc = (t.account as { name: string; currency_code: string }[] | null)?.[0] ?? null;
    const cat = (t.category as { name: string }[] | null)?.[0] ?? null;
    return {
      [m.csv_txn_col_date()]: t.occurred_at,
      [m.csv_txn_col_type()]: t.type,
      [m.csv_txn_col_amount()]: t.amount,
      [m.csv_txn_col_currency()]: acc?.currency_code ?? '',
      [m.csv_txn_col_account()]: acc?.name ?? '',
      [m.csv_txn_col_category()]: cat?.name ?? '',
      [m.csv_txn_col_note()]: t.note ?? '',
    };
  });

  return {
    filename: `transactions-${todayStamp()}.csv`,
    content: toCsv(rows),
  };
}

export async function exportAccountsCSV(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('accounts')
    .select('name, type, currency_code, initial_balance, current_balance, is_archived')
    .eq('user_id', user.id)
    .order('name');
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((a) => ({
    [m.csv_account_col_name()]: a.name,
    [m.csv_account_col_type()]: a.type,
    [m.csv_account_col_currency()]: a.currency_code,
    [m.csv_account_col_initial_balance()]: a.initial_balance,
    [m.csv_account_col_current_balance()]: a.current_balance,
    [m.csv_account_col_archived()]: a.is_archived ? m.csv_yes() : m.csv_no(),
  }));

  return {
    filename: `accounts-${todayStamp()}.csv`,
    content: toCsv(rows),
  };
}

export async function exportCategoriesCSV(): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('categories')
    .select('name, type, icon_name, color, is_default')
    .eq('user_id', user.id)
    .order('type')
    .order('name');
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((c) => ({
    [m.csv_category_col_name()]: c.name,
    [m.csv_category_col_type()]: c.type === 'income' ? m.csv_type_income() : m.csv_type_expense(),
    Icon: c.icon_name,
    [m.csv_category_col_color()]: c.color,
    [m.csv_category_col_default()]: c.is_default ? m.csv_yes() : m.csv_no(),
  }));

  return {
    filename: `categories-${todayStamp()}.csv`,
    content: toCsv(rows),
  };
}
