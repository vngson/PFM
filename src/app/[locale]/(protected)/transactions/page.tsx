// Trang quản lý giao dịch — Server Component fetch summary + list, Client Component render UI.
// URL params: ?month=YYYY-MM&type=income|expense&q=note&before=YYYY-MM-DD
// 'transfer' không còn ở đây — chip filter transfer đã bị loại bỏ; legacy URL
// ?type=transfer sẽ fallback về undefined và hiển thị tab "Tất cả".
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
import { listAtmFeeCategories, listWithdrawalBankOptions } from '@/features/withdrawal/actions';
import { WithdrawalForm } from '@/features/withdrawal/withdrawal-form';
import { TransferForm } from '@/features/transfer/transfer-form';
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
const TYPE_VALUES = ['income', 'expense'] as const;

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
  const [summary, accounts, categories, txnResult, atmCategories, bankOptions] = await Promise.all([
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
    listAtmFeeCategories(),
    listWithdrawalBankOptions(),
  ]);

  // Cursor cho load-more: occurred_at của row cuối cùng (cũ nhất trong trang hiện tại)
  const lastRow = txnResult.rows.at(-1);
  const nextBefore = lastRow?.occurred_at.slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          {/* width: full bên trái, actions wrap xuống dòng mới <md
             để "RÚT TIỀN / CHUYỂN TIỀN / XUẤT CSV" không bị cắt ở 390px. */}
          <WithdrawalForm
            accounts={accounts}
            atmCategories={atmCategories}
            bankOptions={bankOptions}
          />
          <TransferForm accounts={accounts} />
          <ExportButton action={exportTransactionsCSV} />
        </div>
      </div>

      {/* Summary chips theo currency (luôn cả tháng, không filter type).
          Mobile: mỗi SummaryCard full-width — padding đều 2 bên, chip dài ra. */}
      <div className="space-y-3">
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
    // Mobile (<md): flex-col — 3 hàng dọc, m�i hàng 1 item (THU / CHI / RÒNG).
    // Tránh tràn khi số tiền VND dài (vd 23.722.421 ₫) ở viewport ~390px.
    // ≥sm: flex-row 3 đoạn ngang, border-r-2 ngăn giữa các cột.
    <div className="flex flex-col divide-y-2 divide-border border-2 border-border bg-card shadow-brutal-sm sm:flex-row sm:items-stretch sm:divide-x-2 sm:divide-y-0">
      <div className="flex items-center justify-between gap-2 bg-income/10 px-4 py-2.5 sm:flex-col sm:justify-center sm:gap-1 sm:border-r-2 sm:border-border sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 text-income">
          <TrendingUp className="size-3.5 shrink-0" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">{m.chart_legend_income()}</span>
        </div>
        <span className="font-heading text-base font-bold text-income sm:text-xl tabular-nums">
          {formatCurrency(income, code)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 bg-expense/10 px-4 py-2.5 sm:flex-col sm:justify-center sm:gap-1 sm:border-r-2 sm:border-border sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 text-expense">
          <TrendingDown className="size-3.5 shrink-0" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">{m.chart_legend_expense()}</span>
        </div>
        <span className="font-heading text-base font-bold text-expense sm:text-xl tabular-nums">
          {formatCurrency(expense, code)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 sm:flex-col sm:justify-center sm:gap-1 sm:px-4 sm:py-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wallet className="size-3.5 shrink-0" />
          <span className="font-heading text-xs font-bold uppercase tracking-wider">
            {m.chart_legend_net()} ({count})
          </span>
        </div>
        <span
          className={`font-heading text-base font-bold tabular-nums sm:text-xl ${net >= 0 ? 'text-income' : 'text-expense'}`}
        >
          {net >= 0 ? '+' : '−'}
          {formatCurrency(Math.abs(net), code)}
        </span>
      </div>
    </div>
  );
}
