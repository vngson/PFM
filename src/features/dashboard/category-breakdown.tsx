'use client';

// CategoryBreakdown: pie chart + legend list cho spending theo category trong tháng.
// Recharts: PieChart với custom colors. Legend kèm icon + amount + pct.
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getIcon } from '@/features/categories/icon-catalog';
import { getNumberLocale } from '@/lib/format';
import type { CategoryBreakdownItem } from './chart-actions';
import * as m from '@/paraglide/messages';

interface CategoryBreakdownProps {
  data: CategoryBreakdownItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(getNumberLocale(), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

const PIE_COLORS = [
  '#ff4d4d', '#f5d547', '#7fb069', '#9b7ede', '#3aa3b8',
  '#ff7e3a', '#e36ab2', '#5dbe6f', '#d9c33a', '#7373ff',
  '#bf5d3a', '#4dabe8', '#a5673a', '#e35d5d', '#3aa888',
];

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {m.chart_pie_empty()}
      </p>
    );
  }

  const total = data.reduce((s, v) => s + v.amount, 0);

  // Pie cần items với màu override theo index
  const pieData = data.map((item, idx) => ({
    ...item,
    fill: PIE_COLORS[idx % PIE_COLORS.length] ?? item.color,
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={64}
              paddingAngle={2}
              stroke="#000"
              strokeWidth={2}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                border: '2px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0 0 #000',
                backgroundColor: '#fff',
                fontSize: 12,
              }}
              formatter={(value) => [
                formatCurrency(Number(value)),
                m.chart_legend_expense(),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-1.5">
        {data.slice(0, 8).map((item, idx) => {
          const Icon = getIcon(item.icon_name);
          const color = PIE_COLORS[idx % PIE_COLORS.length] ?? item.color;
          return (
            <li
              key={item.category_id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center border border-border text-white"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              >
                <Icon className="size-3" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.name}
              </span>
              <span className="font-mono text-xs font-bold tabular-nums">
                {item.pct}%
              </span>
              <span className="w-20 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {formatCurrency(item.amount)}
              </span>
            </li>
          );
        })}
        {data.length > 8 ? (
          <li className="pt-1 text-xs text-muted-foreground">
            {m.chart_pie_more_count({ count: data.length - 8, total: formatCurrency(total) })}
          </li>
        ) : null}
      </ul>
    </div>
  );
}