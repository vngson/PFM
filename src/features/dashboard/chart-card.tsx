'use client';

// ChartCard: wrapper với header + neo-brutalism border.
// Dùng chung cho MonthlyTrend / CategoryBreakdown / AccountBalances.
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Optional badge pill (vd: 'VND') */
  badge?: string;
}

export function ChartCard({ title, subtitle, children, badge }: ChartCardProps) {
  return (
    <div className="border-2 border-border bg-card p-5 shadow-brutal-sm">
      <div className="flex items-center justify-between border-b-2 border-border pb-3">
        <div>
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {badge ? (
          <span className="inline-flex border-2 border-border bg-secondary px-2 py-0.5 font-mono text-xs font-bold uppercase">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
}