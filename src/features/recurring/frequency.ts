// Helper: tính next_run_at dựa trên frequency + current date.
// Logic đơn giản: advance sang kỳ tiếp theo, giữ nguyên day-of-month cho monthly/yearly
// (nếu trượt sang tháng không có ngày đó → fallback last day).
import type { RecurringFrequency } from '@/types/database';
import * as m from '@/paraglide/messages';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const FREQUENCY_LABELS: Record<RecurringFrequency, () => string> = {
  daily: () => m.recurring_freq_daily(),
  weekly: () => m.recurring_freq_weekly(),
  monthly: () => m.recurring_freq_monthly(),
  yearly: () => m.recurring_freq_yearly(),
  every_n_days: () => m.recurring_freq_every_n_days(),
};

/** Advance `from` by 1 unit of `frequency`. Returns YYYY-MM-DD.
 *  Khi frequency='every_n_days' thì `intervalDays` (1-365) bắt buộc. */
export function advanceDate(
  from: string,
  frequency: RecurringFrequency,
  intervalDays?: number | null,
): string {
  const d = new Date(from + 'T00:00:00Z');
  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly': {
      const day = d.getUTCDate();
      d.setUTCMonth(d.getUTCMonth() + 1);
      // Nếu ngày vượt quá số ngày của tháng mới (vd 31 → tháng 2), set về ngày cuối tháng
      const expectedMonth = d.getUTCMonth();
      d.setUTCDate(1);
      d.setUTCMonth(expectedMonth);
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), expectedMonth + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, lastDay));
      break;
    }
    case 'yearly': {
      const day = d.getUTCDate();
      const month = d.getUTCMonth();
      const year = d.getUTCFullYear() + 1;
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      d.setUTCFullYear(year);
      d.setUTCMonth(month);
      d.setUTCDate(Math.min(day, lastDay));
      break;
    }
    case 'every_n_days': {
      const n = Math.max(1, Math.min(365, intervalDays ?? 1));
      d.setUTCDate(d.getUTCDate() + n);
      break;
    }
  }
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / MS_PER_DAY);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
