'use client';

// ViewTabs: toggle giữa List view + Calendar view cho recurring page.
// - Default = list (giữ nguyên behavior).
// - Calendar thì render RecurringCalendar với occurrences prop.
//
// Mobile (<md): full-width 50/50 segmented tabs (flex-1 mỗi tab), padding
// nhỏ (px-3) cho fit icon + label trên 390px.
// Desktop (≥md): inline-flex với padding lớn hơn, giống categories page.

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

type View = 'list' | 'calendar';

export function ViewTabs({
  rules,
  accounts,
  categories,
  monthlyOccurrences,
  initialMonth,
}: ViewTabsProps) {
  const [view, setView] = useState<View>('list');
  const [pending, startTransition] = useTransition();

  const switchTo = (next: View) => {
    startTransition(() => setView(next));
  };

  const TABS: { key: View; label: () => string; icon: typeof List }[] = [
    { key: 'list', label: () => m.view_tab_list(), icon: List },
    { key: 'calendar', label: () => m.view_tab_calendar(), icon: Calendar },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Segmented tab bar.
          Mobile: full-width với flex-1 mỗi tab (chia đều 50% viewport),
            padding nhỏ (px-3) để chừa chỗ cho icon + label.
          Desktop: inline-flex với padding lớn hơn (px-4). */}
      <div
        role="tablist"
        aria-label={m.view_tab_list() + ' / ' + m.view_tab_calendar()}
        className="flex w-full border-2 border-border bg-card shadow-brutal-sm md:inline-flex md:w-auto"
      >
        {TABS.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = view === tab.key;
          const isLoading = pending && tab.key === 'calendar' && !isActive;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.key}`}
              onClick={() => switchTo(tab.key)}
              disabled={pending}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-1.5 px-3 font-heading text-xs font-bold uppercase tracking-wider transition-all disabled:cursor-progress disabled:opacity-70 md:h-10 md:flex-none md:gap-2 md:px-4',
                idx > 0 && 'border-l-2 border-border',
                isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-card hover:bg-secondary/40',
              )}
            >
              {isLoading ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <Icon className="size-4 shrink-0" />
              )}
              <span className="truncate">{tab.label()}</span>
            </button>
          );
        })}
      </div>

      {view === 'list' ? (
        <div id="tab-panel-list" role="tabpanel" aria-labelledby="tab-list">
          <RecurringList
            rules={rules}
            accounts={accounts}
            categories={categories}
          />
        </div>
      ) : (
        <div id="tab-panel-calendar" role="tabpanel" aria-labelledby="tab-calendar">
          <RecurringCalendar
            initialOccurrences={monthlyOccurrences}
            initialMonth={initialMonth}
          />
        </div>
      )}
    </div>
  );
}