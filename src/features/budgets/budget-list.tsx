'use client';

// BudgetList: list ngân sách theo tháng + progress bar spent/limit.
// - Mỗi card: icon category, tên category, hạn mức, đã chi, progress bar.
// - Warning khi spent >= 100% (đỏ) hoặc spent >= 80% (vàng).
// - Actions: Sửa, Xoá (qua inline <BudgetForm trigger="edit">).
// Neo-brutalism: border + shadow + progress bar dày 4px.
import { useState, useTransition } from 'react';
import { AlertTriangle, Target, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { getIcon } from '@/features/categories/icon-catalog';
import type { Budget } from '@/types/database';
import type { BudgetWithSpent } from './actions';
import { BudgetForm } from './budget-form';
import { deleteBudget } from './actions';
import { notify } from '@/lib/toast';
import { formatCurrency } from '@/lib/format';
import * as m from '@/paraglide/messages';

interface CategoryOption {
  id: string;
  name: string;
  icon_name: string;
  color: string;
}

interface BudgetListProps {
  budgets: BudgetWithSpent[];
  categories: CategoryOption[];
}

function statusFor(percent: number): {
  label: string;
  barClass: string;
  badgeClass: string;
  isOver: boolean;
} {
  if (percent >= 100) {
    return {
      label: m.budgets_status_over(),
      barClass: 'bg-expense',
      badgeClass: 'bg-expense text-white',
      isOver: true,
    };
  }
  if (percent >= 80) {
    return {
      label: m.budgets_status_warning(),
      barClass: 'bg-expense/80',
      badgeClass: 'bg-expense/20 text-expense',
      isOver: false,
    };
  }
  return {
    label: m.budgets_status_ok(),
    barClass: 'bg-income',
    badgeClass: 'bg-income/20 text-income',
    isOver: false,
  };
}

export function BudgetList({ budgets, categories }: BudgetListProps) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteBudget(id);
        notify.success(m.budgets_delete_toast());
        setDeletingId(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.budgets_err_delete());
        setDeletingId(null);
      }
    });
  };

  if (budgets.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title={m.budgets_create_first()}
        description={m.budgets_empty_short_desc()}
      />
    );
  }

  // Tính tổng toàn tháng
  const totalLimit = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const overCount = budgets.filter((b) => b.spent >= Number(b.amount)).length;

  return (
    <div className="space-y-4">
      {/* Summary chip */}
      <div className="flex flex-wrap items-stretch gap-0 border-2 border-border shadow-brutal-sm">
        <div className="flex flex-1 flex-col justify-center gap-1 border-b-2 border-border bg-card px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r-2">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.budgets_summary_total_limit()}
          </span>
          <span className="font-heading text-xl font-bold">
            {formatCurrency(totalLimit, 'VND')}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 border-b-2 border-border bg-card px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r-2">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.budgets_summary_spent()}
          </span>
          <span className="font-heading text-xl font-bold text-expense">
            {formatCurrency(totalSpent, 'VND')}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 bg-card px-4 py-3">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {m.budgets_summary_progress()}
          </span>
          <span
            className={`font-heading text-xl font-bold ${
              totalPct >= 100 ? 'text-expense' : 'text-income'
            }`}
          >
            {totalPct}%
            {overCount > 0 ? (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-expense">
                <AlertTriangle className="size-3" /> {m.budgets_summary_over({ count: overCount })}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {/* List cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {budgets.map((b) => {
          const limit = Number(b.amount);
          const pct = limit > 0 ? Math.min((b.spent / limit) * 100, 200) : 0;
          const pctRound = Math.round((b.spent / limit) * 100);
          const status = statusFor(pctRound);
          const Icon = getIcon(b.category?.icon_name ?? 'Wallet');
          const remaining = limit - b.spent;

          return (
            <div
              key={b.id}
              className="border-2 border-border bg-card p-4 shadow-brutal-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                    style={{ backgroundColor: b.category?.color ?? '#64748b' }}
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wide">
                      {b.category?.name ?? m.budgets_card_fallback_category()}
                    </h3>
                    <span
                      className={`mt-1 inline-flex border-2 border-border px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wider ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <BudgetForm
                    budget={b as Budget}
                    categories={categories}
                    defaultMonth={b.period_month.slice(0, 7)}
                    trigger="edit"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={m.budgets_delete_title()}
                    onClick={() => setDeletingId(b.id)}
                    data-destructive="true"
                  >
                    <Trash2 className="size-3.5" /> {m.common_delete()}
                  </Button>
                </div>
              </div>

              {/* Amount row */}
              <div className="mt-4 flex items-baseline justify-between">
                <span className="font-heading text-2xl font-bold">
                  {formatCurrency(b.spent, 'VND')}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {formatCurrency(limit, 'VND')}
                  </span>
                </span>
                <span
                  className={`font-heading text-sm font-bold ${
                    status.isOver ? 'text-expense' : 'text-muted-foreground'
                  }`}
                >
                  {remaining >= 0
                    ? m.budgets_card_remaining({ amount: formatCurrency(remaining, 'VND') })
                    : m.budgets_card_exceeded({ amount: formatCurrency(Math.abs(remaining), 'VND') })}
                </span>
              </div>

              {/* Progress bar — clipped at 100% for visual */}
              <div
                className="mt-3 h-4 w-full border-2 border-border bg-muted"
                role="progressbar"
                aria-valuenow={Math.min(pctRound, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full transition-all ${status.barClass}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              {status.isOver ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-expense">
                  <AlertTriangle className="size-3" /> {m.budgets_card_over_pct({ pct: pctRound - 100 })}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Delete confirm mount 1 lần ở root, không bên trong dropdown — tránh
          Dialog unmount khi Menu đóng. */}
      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.budgets_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.budgets_delete_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) handleDelete(deletingId);
              }}
              disabled={pending}
            >
              {pending ? m.common_deleting() : m.common_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}