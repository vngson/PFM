'use server';

// Server-side helper: tính các occurrences của recurring rules rơi vào 1 tháng (YYYY-MM).
// Phase 17: dùng cho calendar view.
// - Lấy tất cả rules active của user.
// - Với mỗi rule, advance next_run_at bằng `advanceDate` cho đến khi vượt khỏi tháng.
// - Include tất cả occurrences (không phải chỉ next_run_at đầu tiên).

import { createClient } from '@/lib/supabase/server';
import { advanceDate } from './frequency';
import type { RecurringTransaction } from '@/types/database';

export interface RecurringOccurrence {
  date: string;
  rule: Pick<
    RecurringTransaction,
    'id' | 'type' | 'amount' | 'note' | 'is_active' | 'frequency'
  > & {
    account: { id: string; name: string; currency_code: string; color: string | null };
    category: { id: string; name: string; color: string; icon_name: string } | null;
  };
}

interface MonthRange {
  start: string;
  end: string;
}

function monthRange(month: string): MonthRange | null {
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return null;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

/** Lấy tất cả occurrences của recurring active trong tháng. */
export async function getRecurringOccurrences(
  month: string,
): Promise<RecurringOccurrence[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const range = monthRange(month);
  if (!range) return [];

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select(
      'id, type, amount, note, frequency, is_active, next_run_at, end_date, start_date, account:accounts(id, name, currency_code, color), category:categories(id, name, color, icon_name)',
    )
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (error) throw new Error(error.message);

  const occurrences: RecurringOccurrence[] = [];
  for (const row of data ?? []) {
    const r = row as never as {
      id: string;
      type: 'income' | 'expense';
      amount: number;
      note: string | null;
      frequency: RecurringTransaction['frequency'];
      is_active: boolean;
      next_run_at: string;
      end_date: string | null;
      start_date: string;
      account: { id: string; name: string; currency_code: string; color: string | null };
      category: { id: string; name: string; color: string; icon_name: string } | null;
    };

    // Advance từ next_run_at cho đến khi vượt end-of-month
    let cursor = r.next_run_at;
    while (cursor <= range.end) {
      if (r.end_date && cursor > r.end_date) break;
      if (cursor >= range.start) {
        occurrences.push({
          date: cursor,
          rule: {
            id: r.id,
            type: r.type,
            amount: r.amount,
            note: r.note,
            frequency: r.frequency,
            is_active: r.is_active,
            account: {
              id: r.account.id,
              name: r.account.name,
              currency_code: r.account.currency_code,
              color: r.account.color,
            },
            category: r.category,
          },
        });
      }
      cursor = advanceDate(cursor, r.frequency);
    }
  }

  // Sort theo date asc
  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return occurrences;
}
