'use server';

// Aggregations cho dashboard charts.
// - getMonthlyTrend: 12 tháng gần nhất, income/expense/net per month per currency.
// - getCategoryBreakdown: tháng hiện tại, sum(expense) per category, sorted desc.
// - getAccountBalances: account balances hiện tại (sum income - sum expense qua trigger).
//
// Tất cả đều chạy song song từ 1 page (dashboard) — không cần auth check riêng
// (requireUser sẽ throw nếu session invalid → page.tsx catch).

import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}

export interface MonthlyTrendPoint {
  /** YYYY-MM */
  month: string;
  /** Label ngắn cho trục X, vd 'T8' */
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CurrencyTrend {
  code: string;
  points: MonthlyTrendPoint[];
}

const MONTH_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function buildMonthList(monthsBack: number): { month: string; label: string; start: string; end: string }[] {
  const result: { month: string; label: string; start: string; end: string }[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const month = `${y}-${String(m).padStart(2, '0')}`;
    result.push({
      month,
      label: MONTH_LABELS[m - 1] ?? month,
      start: `${y}-${String(m).padStart(2, '0')}-01`,
      end: `${y}-${String(m).padStart(2, '0')}-${lastDay}`,
    });
  }
  return result;
}

/** Income vs expense theo 12 tháng gần nhất, group theo currency. */
export async function getMonthlyTrend(monthsBack = 12): Promise<CurrencyTrend[]> {
  const { supabase, user } = await requireUser();
  const buckets = buildMonthList(monthsBack);
  const overallStart = buckets[0]?.start;
  if (!overallStart) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount, occurred_at, account:accounts(currency_code)')
    .eq('user_id', user.id)
    .gte('occurred_at', overallStart);
  if (error) throw new Error(error.message);

  // Group by (currency_code, month)
  const grouped: Record<string, Record<string, MonthlyTrendPoint>> = {};
  for (const row of data ?? []) {
    const code = (row as never as { account: { currency_code: string } | null }).account?.currency_code ?? 'VND';
    const occurredAt = String(row.occurred_at).slice(0, 10);
    const monthKey = occurredAt.slice(0, 7);
    const bucket = buckets.find((b) => b.month === monthKey);
    if (!bucket) continue;
    if (!grouped[code]) grouped[code] = {};
    if (!grouped[code][monthKey]) {
      grouped[code][monthKey] = {
        month: monthKey,
        label: bucket.label,
        income: 0,
        expense: 0,
        net: 0,
      };
    }
    const point = grouped[code][monthKey]!;
    const amt = Number(row.amount);
    if (row.type === 'income') point.income += amt;
    else if (row.type === 'expense') point.expense += amt;
    point.net = point.income - point.expense;
  }

  // Output: per currency, ordered by month asc
  const result: CurrencyTrend[] = [];
  for (const [code, months] of Object.entries(grouped)) {
    const points = buckets.map((b) => {
      const p = months[b.month];
      return (
        p ?? {
          month: b.month,
          label: b.label,
          income: 0,
          expense: 0,
          net: 0,
        }
      );
    });
    result.push({ code, points });
  }
  result.sort((a, b) => a.code.localeCompare(b.code));
  return result;
}

export interface CategoryBreakdownItem {
  category_id: string;
  name: string;
  icon_name: string;
  color: string;
  amount: number;
  pct: number;
}

/** Spending by category trong 1 tháng (expense only), sorted desc. */
export async function getCategoryBreakdown(month: string): Promise<CategoryBreakdownItem[]> {
  const { supabase, user } = await requireUser();
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return [];
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, icon_name, color)')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .gte('occurred_at', start)
    .lte('occurred_at', end)
    .not('category_id', 'is', null);
  if (error) throw new Error(error.message);

  const byCategory = new Map<
    string,
    { name: string; icon_name: string; color: string; amount: number }
  >();
  for (const row of data ?? []) {
    const cat = (row as never as { category: { id: string; name: string; icon_name: string; color: string } | null }).category;
    if (!cat) continue;
    const existing = byCategory.get(cat.id);
    if (existing) existing.amount += Number(row.amount);
    else
      byCategory.set(cat.id, {
        name: cat.name,
        icon_name: cat.icon_name,
        color: cat.color,
        amount: Number(row.amount),
      });
  }

  const total = Array.from(byCategory.values()).reduce((s, v) => s + v.amount, 0);
  const result: CategoryBreakdownItem[] = Array.from(byCategory.entries())
    .map(([id, v]) => ({
      category_id: id,
      name: v.name,
      icon_name: v.icon_name,
      color: v.color,
      amount: v.amount,
      pct: total > 0 ? Math.round((v.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  return result;
}

export interface AccountBalanceItem {
  id: string;
  name: string;
  currency_code: string;
  icon_name: string | null;
  color: string | null;
  current_balance: number;
  is_archived: boolean;
}

/** Account balances hiện tại (account.current_balance đã được trigger update). */
export async function getAccountBalances(): Promise<AccountBalanceItem[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, currency_code, icon_name, color, current_balance, is_archived')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AccountBalanceItem[];
}