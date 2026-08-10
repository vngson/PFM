'use client';

// ViewTabs: toggle giữa List view + Calendar view cho recurring page.
// - Default = list (giữ nguyên behavior).
// - Calendar thì render RecurringCalendar với occurrences prop.

import { useState, useTransition } from 'react';
import { Calendar, List, Loader2 } from 'lucide-react';
import { RecurringList } from './recurring-list';
import { RecurringCalendar, type CalendarOccurrence } from './calendar-view';
import { cn } from '@/lib/utils';
import * as m from '@/paraglide/messages';

interface ViewTabsProps {
  rules: React.ComponentProps<typeof RecurringList>['rules'];
  accounts: React.ComponentProps<typeof RecurringList>['accounts'];
  categories: React.ComponentProps<typeof RecurringList>['categories'];
  monthlyOccurrences: CalendarOccurrence[];
  initialMonth: string;
}

export function ViewTabs({
  rules,
  accounts,
  categories,
  monthlyOccurrences,
  initialMonth,
}: ViewTabsProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [pending, startTransition] = useTransition();

  const switchTo = (next: 'list' | 'calendar') => {
    startTransition(() => setView(next));
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex border-2 border-border bg-card shadow-brutal-sm">
        <button
          type="button"
          onClick={() => switchTo('list')}
          disabled={pending}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 border-r-2 border-border px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all',
            view === 'list'
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-card hover:bg-secondary/40',
          )}
          aria-pressed={view === 'list'}
        >
          <List className="size-4" /> {m.view_tab_list()}
        </button>
        <button
          type="button"
          onClick={() => switchTo('calendar')}
          disabled={pending}
          className={cn(
            'inline-flex h-10 items-center gap-1.5 px-4 font-heading text-xs font-bold uppercase tracking-wider transition-all',
            view === 'calendar'
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-card hover:bg-secondary/40',
          )}
          aria-pressed={view === 'calendar'}
        >
          {pending && view === 'calendar' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Calendar className="size-4" />
          )}
          {m.view_tab_calendar()}
        </button>
      </div>

      {view === 'list' ? (
        <RecurringList
          rules={rules}
          accounts={accounts}
          categories={categories}
        />
      ) : (
        <RecurringCalendar
          initialOccurrences={monthlyOccurrences}
          initialMonth={initialMonth}
        />
      )}
    </div>
  );
}
