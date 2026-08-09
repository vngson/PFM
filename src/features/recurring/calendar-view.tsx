'use client';

// RecurringCalendar: lịch tháng hiển thị các khoản định kỳ rơi vào từng ngày.
// - Grid 7 cột (T2 → CN), 5-6 hàng.
// - Mỗi cell: số ngày + list các occurrence (income green, expense red).
// - Ô "today" highlight; ô ngoài tháng hiển thị mờ.
// - Click cell → modal list chi tiết (optional, skip — chưa cần).
// Derived từ occurrences prop (server pre-compute).

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getIcon } from '@/features/categories/icon-catalog';
import type { RecurringTransaction } from '@/types/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

export interface CalendarOccurrence {
  date: string; // YYYY-MM-DD
  rule: Pick<
    RecurringTransaction,
    'id' | 'type' | 'amount' | 'note' | 'is_active' | 'frequency'
  > & {
    account: { id: string; name: string; currency_code: string; color: string | null };
    category: { id: string; name: string; color: string; icon_name: string } | null;
  };
}

interface RecurringCalendarProps {
  occurrences: CalendarOccurrence[];
  initialMonth?: string; // YYYY-MM
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(amount: number, code: string): string {
  return new Intl.NumberFormat(getNumberLocale(), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount) + ' ' + code;
}

export function RecurringCalendar({ occurrences, initialMonth }: RecurringCalendarProps) {
  const today = todayIso();
  const [month, setMonth] = useState<string>(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) return initialMonth;
    return today.slice(0, 7);
  });

  const monthLabel = useMemo(() => {
    const [y, mm] = month.split('-').map(Number);
    if (!y || !mm) return month;
    const d = new Date(Date.UTC(y, mm - 1, 1));
    return new Intl.DateTimeFormat(getNumberLocale(), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  }, [month]);

  // Build month grid: 7 cols x 5-6 rows
  const grid = useMemo(() => {
    const [y, mm] = month.split('-').map(Number);
    if (!y || !mm) return [];
    const first = new Date(Date.UTC(y, mm - 1, 1));
    const lastDay = new Date(Date.UTC(y, mm, 0)).getUTCDate();

    // Week starts Monday → weekday: 0=Sun, 1=Mon, ..., 6=Sat; convert to 0=Mon
    const firstWeekday = (first.getUTCDay() + 6) % 7;
    const cells: { date: string; inMonth: boolean }[] = [];

    // Prefix từ tháng trước
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(first);
      d.setUTCDate(d.getUTCDate() - (firstWeekday - i));
      cells.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    // Cells trong tháng
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ date: iso, inMonth: true });
    }
    // Suffix sang tháng sau (làm tròn 6 hàng = 42 cells)
    while (cells.length < 42) {
      const last = cells[cells.length - 1];
      if (!last) break;
      const d = new Date(last.date + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      cells.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    return cells;
  }, [month]);

  // Index occurrences theo date
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarOccurrence[]>();
    for (const occ of occurrences) {
      const arr = map.get(occ.date);
      if (arr) arr.push(occ);
      else map.set(occ.date, [occ]);
    }
    return map;
  }, [occurrences]);

  // Tháng tổng kết
  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const occ of occurrences) {
      if (occ.date.slice(0, 7) !== month) continue;
      const amt = Number(occ.rule.amount);
      if (occ.rule.type === 'income') income += amt;
      else if (occ.rule.type === 'expense') expense += amt;
    }
    return { income, expense, net: income - expense };
  }, [occurrences, month]);

  const goPrev = () => {
    const [y, mm] = month.split('-').map(Number);
    if (!y || !mm) return;
    const d = new Date(Date.UTC(y, mm - 2, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const goNext = () => {
    const [y, mm] = month.split('-').map(Number);
    if (!y || !mm) return;
    const d = new Date(Date.UTC(y, mm, 1));
    setMonth(d.toISOString().slice(0, 7));
  };
  const goToday = () => setMonth(today.slice(0, 7));

  const weekdayLabels = [
    m.recurring_calendar_weekday_mon(),
    m.recurring_calendar_weekday_tue(),
    m.recurring_calendar_weekday_wed(),
    m.recurring_calendar_weekday_thu(),
    m.recurring_calendar_weekday_fri(),
    m.recurring_calendar_weekday_sat(),
    m.recurring_calendar_weekday_sun(),
  ];

  return (
    <div className="space-y-4">
      {/* Header: month nav + totals */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-border bg-card p-4 shadow-brutal-sm">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goPrev}
            aria-label={m.budgets_prev_aria()}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="font-heading text-xs uppercase tracking-wider"
          >
            {m.dashboard_today()}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goNext}
            aria-label={m.budgets_next_aria()}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <h2 className="font-heading text-lg font-bold uppercase tracking-wider">
          {monthLabel}
        </h2>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-income">
            ↑ {formatCurrency(monthTotals.income, 'VND')}
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-expense">
            ↓ {formatCurrency(monthTotals.expense, 'VND')}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((d) => (
          <div
            key={d}
            className="border-2 border-border bg-muted px-2 py-1 text-center font-heading text-xs font-bold uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const dayNum = Number(cell.date.slice(8, 10));
          const isToday = cell.date === today;
          const items = byDate.get(cell.date) ?? [];
          // Sort theo type: expense trước income
          const sorted = [...items].sort((a, b) => {
            if (a.rule.type === b.rule.type) return 0;
            return a.rule.type === 'expense' ? -1 : 1;
          });
          return (
            <div
              key={cell.date}
              className={cn(
                'flex min-h-[88px] flex-col gap-1 border-2 border-border p-1.5 text-xs',
                cell.inMonth ? 'bg-card' : 'bg-muted/40',
                isToday && 'ring-2 ring-secondary ring-offset-1',
                !cell.inMonth && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center font-mono text-xs font-bold',
                    isToday
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {dayNum}
                </span>
                {items.length > 0 ? (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {items.length}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                {sorted.slice(0, 3).map((occ) => {
                  const Icon = occ.rule.category ? getIcon(occ.rule.category.icon_name) : null;
                  const isExp = occ.rule.type === 'expense';
                  return (
                    <div
                      key={occ.rule.id + occ.date}
                      className={cn(
                        'flex items-center gap-1 border-2 border-border px-1 py-0.5 text-[10px] font-bold leading-none',
                        isExp
                          ? 'bg-expense/10 text-expense'
                          : 'bg-income/10 text-income',
                        !occ.rule.is_active && 'opacity-50',
                      )}
                      title={`${occ.rule.note ?? occ.rule.category?.name ?? occ.rule.type} — ${occ.rule.amount} ${occ.rule.account.currency_code}`}
                    >
                      {Icon ? (
                        <span
                          className="inline-flex size-3 shrink-0 items-center justify-center text-white"
                          style={{ backgroundColor: occ.rule.category?.color ?? '#64748b' }}
                        >
                          <Icon className="size-2" />
                        </span>
                      ) : null}
                      <span className="truncate">
                        {occ.rule.category?.name ?? (isExp ? m.transactions_type_expense() : m.transactions_type_income())}
                      </span>
                    </div>
                  );
                })}
                {sorted.length > 3 ? (
                  <p className="text-[10px] text-muted-foreground">
                    {m.recurring_calendar_more({ count: sorted.length - 3 })}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}