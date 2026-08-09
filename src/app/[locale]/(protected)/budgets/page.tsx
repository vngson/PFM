// Trang quản lý ngân sách theo category / tháng.
// URL params: ?month=YYYY-MM (default = tháng hiện tại).
// Server Component fetch listBudgetsWithSpent + expense categories.
// Full i18n qua Paraglide messages + month names động.
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

import {
  listBudgetsWithSpent,
  listExpenseCategoriesForBudget,
} from '@/features/budgets/actions';
import { BudgetForm } from '@/features/budgets/budget-form';
import { BudgetList } from '@/features/budgets/budget-list';
import {
  currentMonth,
  nextMonth,
  previousMonth,
} from '@/features/budgets/period';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface BudgetsPageProps {
  searchParams: Promise<{
    month?: string;
  }>;
}

/** Trả về tên tháng theo locale hiện tại qua Paraglide messages. */
const MONTH_KEYS = [
  m.budgets_month_1,
  m.budgets_month_2,
  m.budgets_month_3,
  m.budgets_month_4,
  m.budgets_month_5,
  m.budgets_month_6,
  m.budgets_month_7,
  m.budgets_month_8,
  m.budgets_month_9,
  m.budgets_month_10,
  m.budgets_month_11,
  m.budgets_month_12,
] as const;

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth();
  const [y, mNum] = month.split('-').map(Number);
  const monthLabel = y && mNum ? `${MONTH_KEYS[mNum - 1]?.() ?? month} ${y}` : month;

  const [budgets, categories] = await Promise.all([
    listBudgetsWithSpent(month),
    listExpenseCategoriesForBudget(),
  ]);

  const prev = previousMonth(month);
  const next = nextMonth(month);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.budgets_chip()}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
            {m.budgets_page_title()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.budgets_page_subtitle()}
          </p>
        </div>
        <BudgetForm
          categories={categories}
          defaultMonth={month}
          trigger="create"
        />
      </div>

      {/* Month switcher */}
      <div className="flex items-center justify-center gap-2">
        <Link
          href={buildLocalizedHref(`/budgets?month=${prev}`, getLocale())}
          className="inline-flex size-10 items-center justify-center border-2 border-border bg-background shadow-brutal-sm transition-all hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          aria-label={m.budgets_prev_aria()}
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="border-2 border-border bg-card px-6 py-2 font-heading text-base font-bold uppercase tracking-wider shadow-brutal-sm">
          {monthLabel}
        </div>
        <Link
          href={buildLocalizedHref(`/budgets?month=${next}`, getLocale())}
          className="inline-flex size-10 items-center justify-center border-2 border-border bg-background shadow-brutal-sm transition-all hover:bg-secondary hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
          aria-label={m.budgets_next_aria()}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="border-2 border-dashed border-border p-8 text-center">
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center border-2 border-border bg-secondary">
            <Target className="size-5" />
          </div>
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.budgets_empty_title()}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.budgets_empty_desc()}{' '}
            <Link
              href={buildLocalizedHref("/categories", getLocale())}
              className="font-bold text-foreground underline decoration-2 underline-offset-2"
            >
              {m.budgets_empty_create_link()}
            </Link>
          </p>
        </div>
      ) : (
        <BudgetList budgets={budgets} categories={categories} />
      )}
    </div>
  );
}
