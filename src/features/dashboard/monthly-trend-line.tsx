'use client';

// MonthlyTrendLine: line chart 12 tháng income vs expense per currency.
// Recharts: LineChart + 2 Line series (income màu income, expense màu expense).
// Responsive container.
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CurrencyTrend } from './chart-actions';
import { getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

interface MonthlyTrendLineProps {
  data: CurrencyTrend[];
}

function formatCurrencyCompact(amount: number, code: string): string {
  if (amount === 0) return '0';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}t${code}`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}tr${code}`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}k${code}`;
  return `${amount}${code}`;
}

export function MonthlyTrendLine({ data }: MonthlyTrendLineProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {m.chart_trend_empty()}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((series) => (
        <div key={series.code} className="space-y-2">
          {data.length > 1 ? (
            <h3 className="font-heading text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {series.code}
            </h3>
          ) : null}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series.points}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#000" strokeDasharray="2 4" strokeOpacity={0.15} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  stroke="#000"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#000"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCurrencyCompact(v, '')}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    border: '2px solid #000',
                    borderRadius: 0,
                    boxShadow: '4px 4px 0 0 #000',
                    backgroundColor: '#fff',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    new Intl.NumberFormat(getNumberLocale()).format(Number(value)) + ' ' + series.code,
                    name === 'income' ? m.chart_legend_income() : name === 'expense' ? m.chart_legend_expense() : m.chart_legend_net(),
                  ]}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="square"
                  formatter={(v) => (v === 'income' ? m.chart_legend_income() : v === 'expense' ? m.chart_legend_expense() : v)}
                  wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="income"
                  stroke="#7fb069"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#7fb069', strokeWidth: 1.5, stroke: '#000' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="#ff4d4d"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ff4d4d', strokeWidth: 1.5, stroke: '#000' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}