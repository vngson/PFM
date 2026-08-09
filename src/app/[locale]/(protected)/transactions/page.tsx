// Trang quản lý giao dịch — Server Component fetch summary + list, Client Component render UI.
// URL params: ?month=YYYY-MM&type=income|expense|transfer&q=note&before=YYYY-MM-DD
// Neo-brutalism: bordered shadow cards cho summary chips, group theo ngày.
// Full i18n qua Paraglide messages + locale-aware formatters.
import Link from 'next/link';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

import {
  getMonthSummary,
  listActiveAccounts,
  listCategoriesForSelect,
  listTransactions,
} from '@/features/transactions/actions';
import type { Transaction } from '@/types/database';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { TransactionList } from '@/features/transactions/transaction-list';
import { FilterChipRow } from '@/features/transactions/filter-chip-row';
import { SearchBox } from '@/features/transactions/search-box';
import { LoadMore } from '@/features/transactions/load-more';
import { ExportButton } from '@/features/export/export-button';
import { exportTransactionsCSV } from '@/features/export/actions';
import { formatCurrency } from '@/lib/format';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const PAGE_SIZE = 50;
const TYPE_VALUES = ['income', 'expense', 'transfer'] as const;

interface TransactionsPageProps {
  searchParams: Promise<{
    month?: string;
    type?: string;
    q?: string;
    before?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth();

  const typeFilter: Transaction['type'] | undefined = TYPE_VALUES.find(
    (t) => t === sp.type,
  );
  const qFilter = (sp.q ?? '').trim().slice(0, 80); // giới hạn 80 chars tránh query quá dài
  const before = sp.before && /^\d{4}-\d{2}-\d{2}$/.test(sp.before) ? sp.before : undefined;

  // Parallel fetch: summary (luôn lấy theo month) + accounts + categories + transactions (filter)
  const [summary, accounts, categories, txnResult] = await Promise.all([
    getMonthSummary(month),
    listActiveAccounts(),
    listCategoriesForSelect(),
    listTransactions({
      month,
      type: typeFilter,
      q: qFilter,
      before,
      limit: PAGE_SIZE,
    }),
  ]);

  // Cursor cho load-more: occurred_at của row cuối cùng (cũ nhất trong trang hiện tại)
  const lastRow = txnResult.rows.at(-1);
  const nextBefore = lastRow?.occurred_at.slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.nav_transactions()}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-4xl font-bold uppercase leading-tight tracking-tight">
            {m.transactions_page_title()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {m.transactions_page_subtitle()}
          </p>
        </div>
        <TransactionForm
          accounts={accounts}
          categories={categories}
          trigger="create"
        />
        <div className="flex items-center gap-2">
          <ExportButton action={exportTransactionsCSV} />
        </div>
      </div>

      {/* Summary chips theo currency (luôn cả tháng, không filter type) */}
      <div className="flex flex-wrap gap-3">
        {Object.keys(summary.byCurrency).length === 0 ? (
          <div className="border-2 border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {m.transactions_empty_desc()}
          </div>
        ) : (
          Object.entries(summary.byCurrency).map(([code, s]) => (
            <SummaryCard
              key={code}
              code={code}
              income={s.income}
              expense={s.expense}
              net={s.net}
              count={s.count}
            />
          ))
        )}
      </div>

      {/* Filter + search */}
      <div className="space-y-3">
        <FilterChipRow
          currentType={typeFilter ?? null}
        />
        <SearchBox
          defaultValue={qFilter}
          placeholder={m.transactions_search_placeholder()}
        />
      </div>

      <TransactionList
        transactions={txnResult.rows}
        accounts={accounts}
        categories={categories}
        isFiltered={!!typeFilter || !!qFilter}
        clearHref="/transactions"
      />

      {/* Empty state khi filter không match */}
      {txnResult.rows.length === 0 && (typeFilter || qFilter) ? (
        <p className="text-center text-sm text-muted-foreground">
          {m.search_empty_for_query({ query: qFilter })} {/* reuse search empty */}
        </p>
      ) : null}

      {accounts.length === 0 ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {m.dashboard_create_account_link()}{' '}
          <Link href={buildLocalizedHref("/accounts", getLocale())} className="font-bold text-foreground underline decoration-2 underline-offset-2">
            {m.accounts_create_btn()} →
          </Link>
        </p>
      ) : null}

      {/* Load more — chỉ hiện khi không filter (filter thì cursor chưa support) */}
      {!typeFilter && !qFilter && txnResult.hasMore && nextBefore ? (
        <LoadMore before={nextBefore} month={month} />
      ) : null}

      {!typeFilter && !qFilter && txnResult.rows.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {m.dashboard_txn_count_month({ count: txnResult.rows.length })}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({
  code,
  income,
  expense,
  net,
  count,
}: {
  code: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-0 border-2 border-border shadow-brutal-sm">
      <div className="flex flex-col justify-center gap-1 border-b-2 border-border bg-income/10 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r-2">
        <div className="flex items-center gap-1.5 text-income">
          <TrendingUp className="size-3.5" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">{m.chart_legend_income()}</span>
        </div>
        <span className="font-heading text-xl font-bold text-income">
          {formatCurrency(income, code)}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-1 border-b-2 border-border bg-expense/10 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r-2">
        <div className="flex items-center gap-1.5 text-expense">
          <TrendingDown className="size-3.5" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">{m.chart_legend_expense()}</span>
        </div>
        <span className="font-heading text-xl font-bold text-expense">
          {formatCurrency(expense, code)}
        </span>
      </div>
      <div className="flex flex-col justify-center gap-1 bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wallet className="size-3.5" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">
            {m.chart_legend_net()} ({count})
          </span>
        </div>
        <span
          className={`font-heading text-xl font-bold ${net >= 0 ? 'text-income' : 'text-expense'}`}
        >
          {net >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(net), code)}
        </span>
      </div>
    </div>
  );
}
