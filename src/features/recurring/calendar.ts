'use server';

// Server-side helper: tính các occurrences của recurring rules rơi vào 1 tháng (YYYY-MM).
// Dùng cho calendar view.
// - Lấy tất cả rules active của user.
// - Với mỗi rule, advance từ `start_date` cho đến khi vượt `range.end`.
// - Hiển thị TẤT CẢ occurrences rơi vào tháng (cả đã sinh lẫn tương lai) để user
//   thấy được tháng đó có bao nhiêu khoản. `next_run_at` là "vị trí cursor hiện tại"
//   nhưng KHÔNG phải điểm bắt đầu duy nhất — back-fill từ `start_date`.

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
      'id, type, amount, note, frequency, interval_days, is_active, next_run_at, end_date, start_date, account:accounts(id, name, currency_code, color), category:categories(id, name, color, icon_name)',
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
      interval_days: number | null;
      is_active: boolean;
      next_run_at: string;
      end_date: string | null;
      start_date: string;
      account: { id: string; name: string; currency_code: string; color: string | null };
      category: { id: string; name: string; color: string; icon_name: string } | null;
    };

    // Back-fill từ `start_date` để calendar thấy được cả các khoản đã sinh trong tháng
    // (không chỉ những khoản còn ở tương lai của `next_run_at`). Đây là yêu cầu UX
    // "tháng này có bao nhiêu khoản" — user cần thấy tổng thể.
    //
    // Safety cap: tối đa 366 occurrence / rule (1 năm) — đủ cho mọi frequency.
    // Nếu frequency unknown / malformed → advanceDate không làm gì → vòng lặp vô tận
    // → cap này chặn server hang và return empty cho rule đó thay vì đơ.
    const MAX_OCCURRENCES = 366;
    let cursor = r.start_date;
    let steps = 0;
    while (cursor <= range.end && steps < MAX_OCCURRENCES) {
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
      const next = advanceDate(cursor, r.frequency, r.interval_days);
      // Defensive: nếu advance không advance (frequency unknown) → break tránh hang.
      if (next <= cursor) break;
      cursor = next;
      steps += 1;
    }
  }

  // Sort theo date asc
  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return occurrences;
}
