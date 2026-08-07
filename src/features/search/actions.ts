'use server';

// Global search action — tìm transactions, accounts, categories theo query.
// Chạy song song 3 query, trả kết quả gom nhóm theo loại.

import { createClient } from '@/lib/supabase/server';
import { getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

export interface SearchResult {
  type: 'transaction' | 'account' | 'category';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

export interface SearchResults {
  transactions: SearchResult[];
  accounts: SearchResult[];
  categories: SearchResult[];
  total: number;
}

const MAX_PER_GROUP = 5;
const EM_DASH = '—';

export async function globalSearch(query: string): Promise<SearchResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { transactions: [], accounts: [], categories: [], total: 0 };
  }

  const q = query.trim();
  if (q.length < 1) {
    return { transactions: [], accounts: [], categories: [], total: 0 };
  }

  const pattern = `%${q}%`;
  const locale = getNumberLocale();

  const [txns, accts, cats] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        'id, note, amount, type, occurred_at, account:accounts(name), category:categories(name)',
      )
      .eq('user_id', user.id)
      .or(`note.ilike.${pattern}`)
      .order('occurred_at', { ascending: false })
      .limit(MAX_PER_GROUP),
    supabase
      .from('accounts')
      .select('id, name, currency_code, current_balance')
      .eq('user_id', user.id)
      .ilike('name', pattern)
      .order('name')
      .limit(MAX_PER_GROUP),
    supabase
      .from('categories')
      .select('id, name, type, icon_name, color')
      .eq('user_id', user.id)
      .ilike('name', pattern)
      .order('type')
      .order('name')
      .limit(MAX_PER_GROUP),
  ]);

  const transactions: SearchResult[] = (txns.data ?? []).map((t) => {
    const acct = (t.account as { name: string }[] | null)?.[0] ?? null;
    const cat = (t.category as { name: string }[] | null)?.[0] ?? null;
    const title = t.note?.trim() || cat?.name || acct?.name || m.search_kind_txn();
    const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '';
    return {
      type: 'transaction',
      id: t.id,
      title,
      subtitle: `${acct?.name ?? EM_DASH} · ${cat?.name ?? EM_DASH}`,
      meta: `${sign}${Number(t.amount).toLocaleString(locale)} · ${t.occurred_at}`,
      href: `/transactions?q=${encodeURIComponent(t.note ?? '')}`,
    };
  });

  const accounts: SearchResult[] = (accts.data ?? []).map((a) => ({
    type: 'account' as const,
    id: a.id,
    title: a.name,
    subtitle: a.currency_code,
    meta: Number(a.current_balance).toLocaleString(locale),
    href: '/accounts',
  }));

  const categories: SearchResult[] = (cats.data ?? []).map((c) => ({
    type: 'category' as const,
    id: c.id,
    title: c.name,
    subtitle: c.type === 'income' ? m.categories_form_type_income() : m.categories_form_type_expense(),
    href: '/categories',
  }));

  return {
    transactions,
    accounts,
    categories,
    total: transactions.length + accounts.length + categories.length,
  };
}