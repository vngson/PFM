'use client';

// AccountBalances: horizontal bar list cho số dư từng account.
// Custom render (không dùng recharts BarChart) để control typography tốt hơn —
// vẫn có thể swap sang recharts sau nếu cần hover tooltip.
import { getIcon } from '@/features/categories/icon-catalog';
import { getNumberLocale } from '@/lib/format';
import type { AccountBalanceItem } from './chart-actions';
import * as m from '@/paraglide/messages';

interface AccountBalancesProps {
  data: AccountBalanceItem[];
}

function formatCurrency(amount: number, code: string): string {
  return new Intl.NumberFormat(getNumberLocale(), {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function AccountBalances({ data }: AccountBalancesProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {m.chart_balance_empty()}
      </p>
    );
  }

  // Tính max absolute để scale bar
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.current_balance)), 1);
  const totalByCurrency = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.currency_code] = (acc[d.currency_code] ?? 0) + d.current_balance;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(totalByCurrency).map(([code, total]) => (
        <div
          key={code}
          className="flex items-baseline justify-between border-2 border-border bg-secondary px-3 py-2"
        >
          <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {m.chart_balance_total({ code })}
          </span>
          <span
            className={`font-heading text-base font-bold ${
              total >= 0 ? 'text-foreground' : 'text-expense'
            }`}
          >
            {formatCurrency(total, code)}
          </span>
        </div>
      ))}

      <ul className="space-y-2.5">
        {data.map((acc) => {
          const Icon = getIcon(acc.icon_name ?? '');
          const widthPct = Math.min((Math.abs(acc.current_balance) / maxAbs) * 100, 100);
          const negative = acc.current_balance < 0;
          return (
            <li key={acc.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex size-5 shrink-0 items-center justify-center border border-border text-white"
                    style={{ backgroundColor: acc.color ?? '#64748b' }}
                    aria-hidden="true"
                  >
                    <Icon className="size-3" />
                  </span>
                  <span className="truncate font-medium">
                    {acc.name}
                    {acc.is_archived ? (
                      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                        {m.common_archived_suffix()}
                      </span>
                    ) : null}
                  </span>
                </div>
                <span
                  className={`font-mono text-xs font-bold tabular-nums ${
                    negative ? 'text-expense' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(acc.current_balance, acc.currency_code)}
                </span>
              </div>
              <div
                className="h-2 w-full border-2 border-border bg-muted"
                role="progressbar"
                aria-valuenow={widthPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full ${negative ? 'bg-expense' : 'bg-foreground'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}