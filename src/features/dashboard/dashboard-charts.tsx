// Dashboard chart sections — async server components tách ra để
// cho phép Suspense streaming từng chart độc lập.
// Parent page chỉ cần wrap với <Suspense fallback={<SkeletonCard/>}>.

import { ChartCard } from '@/features/dashboard/chart-card';
import { MonthlyTrendLine } from '@/features/dashboard/monthly-trend-line';
import { CategoryBreakdown } from '@/features/dashboard/category-breakdown';
import { AccountBalances } from '@/features/dashboard/account-balances-bar';
import {
  getAccountBalances,
  getCategoryBreakdown,
  getMonthlyTrend,
} from '@/features/dashboard/chart-actions';
import { getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

interface SectionProps {
  month: string;
  y: number;
  m: number;
}

export async function DashboardCharts({ month, y, m: monthNum }: SectionProps) {
  const [trend, categoryBreakdown, accountBalances] = await Promise.all([
    getMonthlyTrend(12),
    getCategoryBreakdown(month),
    getAccountBalances(),
  ]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard
        title={m.chart_trend_title()}
        subtitle={m.chart_trend_subtitle()}
        badge={m.chart_trend_badge()}
      >
        <MonthlyTrendLine data={trend} />
      </ChartCard>
      <ChartCard
        title={m.chart_pie_title({ month: monthNum, year: y })}
        subtitle={m.chart_pie_subtitle()}
        badge={m.chart_pie_badge()}
      >
        <CategoryBreakdown data={categoryBreakdown} />
      </ChartCard>
      <ChartCard
        title={m.chart_balance_title()}
        subtitle={m.chart_balance_subtitle()}
        badge={m.chart_balance_badge()}
      >
        <AccountBalances data={accountBalances.filter((a) => !a.is_archived)} />
      </ChartCard>
      <div className="border-2 border-border bg-card p-5 shadow-brutal-sm">
        <div className="flex items-center justify-between border-b-2 border-border pb-3">
          <div>
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
              {m.chart_top_title()}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {m.chart_top_subtitle()}
            </p>
          </div>
        </div>
        {categoryBreakdown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {m.chart_top_empty()}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {categoryBreakdown.slice(0, 5).map((item, idx) => (
              <li
                key={item.category_id}
                className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center border-2 border-border bg-secondary font-mono text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium">{item.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs font-bold tabular-nums">
                    {item.pct}%
                  </span>
                  <span className="font-heading text-sm font-bold tabular-nums">
                    {new Intl.NumberFormat(getNumberLocale(), {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(item.amount)}
                    {m.dashboard_currency_suffix()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}