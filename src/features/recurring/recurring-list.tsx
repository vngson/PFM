'use client';

// RecurringList: danh sách quy tắc định kỳ.
// - Mỗi row: icon category, tên rule, account, freq badge, ngày chạy tiếp theo.
// - Action: Bật/tắt, Sinh giao dịch (nếu next_run_at <= today), Sửa, Xoá.
// Neo-brutalism: border + shadow + accent màu theo type.
import { useState, useTransition } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pause,
  Play,
  Trash2,
  Repeat,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { RecurringTransaction, RecurringFrequency } from '@/types/database';
import { RecurringForm } from './recurring-form';
import {
  deleteRecurring,
  generateFromRecurring,
  toggleRecurring,
} from './actions';
import { notify } from '@/lib/toast';
import { FREQUENCY_LABELS, todayIso } from './frequency';
import { formatCurrency, getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

interface AccountLite {
  id: string;
  name: string;
  currency_code: string;
  color: string | null;
  icon_name: string | null;
}

interface CategoryLite {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon_name: string;
  color: string;
}

type Row = RecurringTransaction & {
  account: AccountLite;
  category: CategoryLite | null;
};

// Recurring không support 'transfer' (DB constraint).
type RecurringType = 'income' | 'expense';

const TYPE_META: Record<
  RecurringType,
  { label: () => string; color: string; badge: 'income' | 'expense' }
> = {
  income: { label: () => m.recurring_type_income(), color: 'text-income', badge: 'income' },
  expense: { label: () => m.recurring_type_expense(), color: 'text-expense', badge: 'expense' },
};

const FREQUENCY_BADGE: Record<RecurringFrequency, 'default' | 'secondary'> = {
  daily: 'default',
  weekly: 'default',
  monthly: 'secondary',
  yearly: 'secondary',
  every_n_days: 'default',
};

interface RecurringListProps {
  rules: Row[];
  accounts: AccountLite[];
  categories: CategoryLite[];
}

export function RecurringList({
  rules,
  accounts,
  categories,
}: RecurringListProps) {
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingGenerate, setPendingGenerate] = useState<Record<string, true>>({});

  const today = todayIso();

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteRecurring(id);
        notify.success(m.recurring_delete_toast());
        setDeletingId(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.recurring_err_delete());
        setDeletingId(null);
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await toggleRecurring(id, isActive);
        notify.success(isActive ? m.recurring_toggle_success_active() : m.recurring_toggle_success_paused());
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.recurring_err_toggle());
      } finally {
        setBusyId(null);
      }
    });
  };

  const handleGenerate = (id: string) => {
    setPendingGenerate((p) => ({ ...p, [id]: true }));
    startTransition(async () => {
      try {
        await generateFromRecurring(id);
        notify.success(m.recurring_generate_success());
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.recurring_err_generate());
      } finally {
        setPendingGenerate((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
      }
    });
  };

  if (rules.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title={m.recurring_empty_title()}
        description={m.recurring_empty_short_desc()}
      />
    );
  }

  const dateFmt = new Intl.DateTimeFormat(getNumberLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="space-y-3">
      {rules.map((row) => {
        // Recurring chỉ có income/expense; ép kiểu để TYPE_META lookup.
        const rType = row.type as RecurringType;
        const meta = TYPE_META[rType];
        const CatIcon = row.category ? getIcon(row.category.icon_name) : null;
        const AccIcon = getIcon(row.account.icon_name ?? '');
        const due = row.next_run_at <= today;
        const canGenerate = row.is_active && due;
        const isBusy = busyId === row.id || pendingGenerate[row.id] === true;

        return (
          <div
            key={row.id}
            className={`flex flex-col gap-3 border-2 border-border bg-card p-4 shadow-brutal-sm transition-opacity sm:flex-row sm:items-center sm:gap-4 ${
              !row.is_active ? 'opacity-60' : ''
            }`}
          >
            {/* Icon block */}
            <div
              className="flex size-12 shrink-0 items-center justify-center border-2 border-border text-white"
              style={{
                backgroundColor:
                  row.category?.color ??
                  (row.type === 'income' ? '#7fb069' : '#ff4d4d'),
              }}
              aria-hidden="true"
            >
              {CatIcon ? (
                <CatIcon className="size-6" />
              ) : row.type === 'income' ? (
                <ArrowDownLeft className="size-6" />
              ) : (
                <ArrowUpRight className="size-6" />
              )}
            </div>

            {/* Main info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-bold uppercase tracking-wide">
                  {row.category?.name ?? TYPE_META[rType].label()}
                </span>
                <Badge variant={meta.badge}>{meta.label()}</Badge>
                <Badge variant={FREQUENCY_BADGE[row.frequency]}>
                  {FREQUENCY_LABELS[row.frequency]()}
                </Badge>
                {!row.is_active ? (
                  <Badge variant="outline">{m.recurring_paused_label()}</Badge>
                ) : null}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-flex size-3 shrink-0 items-center justify-center border border-border"
                    style={{ backgroundColor: row.account.color ?? '#64748b' }}
                  >
                    <AccIcon className="size-2 text-white" />
                  </span>
                  {row.account.name}
                </span>
                <span>·</span>
                <span>
                  {m.recurring_next_label()}{' '}
                  <span className="font-medium text-foreground">
                    {dateFmt.format(new Date(row.next_run_at))}
                  </span>
                </span>
                {row.end_date ? (
                  <>
                    <span>·</span>
                    <span>{m.recurring_until_label({ date: dateFmt.format(new Date(row.end_date)) })}</span>
                  </>
                ) : null}
              </div>

              {row.note ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {row.note}
                </p>
              ) : null}
            </div>

            {/* Amount */}
            <div className={`text-left font-heading text-lg font-bold sm:text-right ${meta.color}`}>
              {row.type === 'income' ? '+' : '−'}{' '}
              {formatCurrency(Number(row.amount), row.account.currency_code)}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {canGenerate ? (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => handleGenerate(row.id)}
                  disabled={isBusy || pending}
                  aria-label={m.recurring_generate_aria()}
                >
                  <Zap className="size-4" /> {m.recurring_generate_btn_short()}
                </Button>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">
                  {row.is_active ? m.recurring_waiting({ date: dateFmt.format(new Date(row.next_run_at)) }) : m.recurring_paused_label()}
                </span>
              )}

              <RecurringForm
                rule={row}
                accounts={accounts}
                categories={categories}
                trigger="edit"
              />

              <Button
                variant="ghost"
                size="sm"
                aria-label={m.accounts_actions_aria()}
                onClick={() => handleToggle(row.id, !row.is_active)}
                disabled={isBusy}
              >
                {row.is_active ? (
                  <>
                    <Pause className="size-3.5" /> {m.recurring_pause()}
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" /> {m.recurring_activate()}
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                aria-label={m.accounts_actions_aria()}
                onClick={() => setDeletingId(row.id)}
                data-destructive="true"
              >
                <Trash2 className="size-3.5" /> {m.common_delete()}
              </Button>
            </div>
          </div>
        );
      })}

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
            <AlertDialogTitle>{m.recurring_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.recurring_delete_desc()}
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