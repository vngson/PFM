// Database types — phải khớp với schema trong supabase/migrations/0001_init_schema.sql
// Dùng cho typed Supabase client sau này (sẽ generate từ `supabase gen types` ở phase sau).

export type CategoryType = 'income' | 'expense';
export type AccountType =
  | 'cash'
  | 'bank'
  | 'credit_card'
  | 'e_wallet'
  | 'savings'
  | 'investment'
  | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  currency_code: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon_name: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency_code: string;
  initial_balance: number;
  current_balance: number;
  icon_name: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  occurred_at: string;
  note: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period_month: string; // YYYY-MM-01
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run_at: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
}
