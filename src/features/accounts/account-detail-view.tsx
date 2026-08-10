// AccountDetailView: header (icon + name + balance + type + archived badge) + summary chips +
// danh sách giao dịch (server-side render). Load-more qua Link ?before=YYYY-MM-DD.
import { TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getIcon } from '@/features/categories/icon-catalog';
import type { Account } from '@/types/database';
import { formatCurrency } from '@/lib/format';
import * as m from '@/paraglide/messages';
import { AccountTxSection } from './account-tx-section';

const FALLBACK_ICON = 'wallet';

const TYPE_LABELS: Record<Account['type'], () => string> = {
  cash: () => m.accounts_type_cash(),
  bank: () => m.accounts_type_bank(),
  credit_card: () => m.accounts_type_credit_card(),
  e_wallet: () => m.accounts_type_e_wallet(),
  savings: () => m.accounts_type_savings(),
  investment: () => m.accounts_type_investment(),
  other: () => m.accounts_type_other(),
};

type Row = {
  id: string;
  occurred_at: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  note: string | null;
  category: { id: string; name: string; icon_name: string; color: string; type: 'income' | 'expense' } | null;
};

interface AccountDetailViewProps {
  account: Account;
  transactions: Row[];
  nextBefore: string | undefined;
  hasMore: boolean;
}

export function AccountDetailView({
  account,
  transactions,
  nextBefore,
  hasMore,
}: AccountDetailViewProps) {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.amount;
    else if (t.type === 'expense') totalExpense += t.amount;
    // transfer không tính vào income/expense của account — chỉ là dịch chuyển.
  }
  // Pick the right plural variant — paraglide-js v2 chưa hỗ trợ ICU plural,
  // nên tách thành 3 key zero/one/other để compile được. Pattern này match với
  // phần còn lại của codebase (chưa có plural nào khác).
  const txCountLabel =
    transactions.length === 0
      ? m.account_detail_tx_count_zero()
      : transactions.length === 1
        ? m.account_detail_tx_count_one()
        : m.account_detail_tx_count_other({ count: transactions.length });

  // Wrap header icon rendering in a nested function — react-hooks/static-components
  // lint only allows creating components inside callbacks (not in the function body).
  // Mirrors the pattern in account-list.tsx where Icon is created inside .map().
  function renderHeaderIcon() {
    const Icon = getIcon(account.icon_name ?? FALLBACK_ICON);
    return (
      <div
        className="flex size-14 shrink-0 items-center justify-center border-2 border-border text-white"
        style={{ backgroundColor: account.color ?? '#64748b' }}
      >
        <Icon className="size-7" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-2 border-border bg-card p-5 shadow-brutal-sm">
        <div className="flex items-center gap-4">
          {renderHeaderIcon()}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-3xl font-bold uppercase leading-tight tracking-tight">
                {account.name}
              </h1>
              <Badge variant="secondary">{TYPE_LABELS[account.type]()}</Badge>
              {account.is_archived ? (
                <Badge variant="outline">{m.account_detail_archived_badge()}</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {m.account_detail_initial_label()}:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(account.initial_balance, account.currency_code)}
              </span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.accounts_table_balance()}
          </div>
          <div className="mt-1 font-heading text-3xl font-bold text-foreground">
            {formatCurrency(account.current_balance, account.currency_code)}
          </div>
        </div>
      </header>

      {/* Summary chips — chỉ tính trên page hiện tại (page đầu tiên). Vẫn hữu ích vì
          user vào detail thường muốn biết account này đã có bao nhiêu thu/chi. */}
      {transactions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          <SummaryChip
            variant="income"
            label={m.account_detail_total_income()}
            value={totalIncome}
            currencyCode={account.currency_code}
            icon={<TrendingUp className="size-3.5" />}
          />
          <SummaryChip
            variant="expense"
            label={m.account_detail_total_expense()}
            value={totalExpense}
            currencyCode={account.currency_code}
            icon={<TrendingDown className="size-3.5" />}
          />
          <SummaryChip
            variant="neutral"
            label={txCountLabel}
            value={null}
            currencyCode={account.currency_code}
          />
        </div>
      ) : null}

      {/* Transactions list */}
      <AccountTxSection
        transactions={transactions}
        currencyCode={account.currency_code}
        nextBefore={nextBefore}
        hasMore={hasMore}
      />
    </div>
  );
}

function SummaryChip({
  variant,
  label,
  value,
  currencyCode,
  icon,
}: {
  variant: 'income' | 'expense' | 'neutral';
  label: string;
  value: number | null;
  currencyCode: string;
  icon?: React.ReactNode;
}) {
  const colorClass =
    variant === 'income'
      ? 'text-income'
      : variant === 'expense'
        ? 'text-expense'
        : 'text-foreground';
  return (
    <div className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-2 shadow-brutal-sm">
      <span className={`flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wider ${colorClass}`}>
        {icon}
        {label}
      </span>
      {value !== null ? (
        <span className="font-heading text-base font-bold">{formatCurrency(value, currencyCode)}</span>
      ) : null}
    </div>
  );
}