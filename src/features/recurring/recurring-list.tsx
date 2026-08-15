'use client';

// RecurringList: danh sách quy tắc định kỳ.
// Mobile (<md): mỗi rule là 1 card stacked theo cột:
//   - Row 1: icon (48px neo-brutal) + (name + meta nhỏ) | amount.
//   - Row 2: badges (income/expense + freq + paused) dạng wrap.
//   - Row 3: meta phụ (account + next_run).
//   - Row 4: action menu (3 nút → thu gọn vào dropdown ⋮, primary CTA
//     "Sinh GD" vẫn là button nổi bật khi due=true).
// Desktop (≥md): row ngang icon + info + amount + 3 button rows (giống cũ).
//
// Neo-brutalism: border-2 + shadow-brutal-sm + accent theo type.
// Một số row actions: generate (primary), edit, pause/resume, delete.

import { useState, useTransition } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Repeat,
  Zap,
  Pencil,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <div className="space-y-2 md:space-y-3">
      {rules.map((row) => {
        // Recurring chỉ có income/expense; ép kiểu để TYPE_META lookup.
        const rType = row.type as RecurringType;
        const meta = TYPE_META[rType];
        const CatIcon = row.category ? getIcon(row.category.icon_name) : null;
        const AccIcon = getIcon(row.account.icon_name ?? '');
        const due = row.next_run_at <= today;
        const canGenerate = row.is_active && due;
        const isBusy = busyId === row.id || pendingGenerate[row.id] === true;
        const nextLabel = dateFmt.format(new Date(row.next_run_at));

        return (
          <div
            key={row.id}
            className={`flex flex-col gap-2 border-2 border-border bg-card p-2.5 shadow-brutal-sm transition-opacity sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
              !row.is_active ? 'opacity-60' : ''
            }`}
          >
            {/* === Row 1: icon + (name + meta) | amount ===
                Mobile: flex (column ở row info, amount bên phải).
                Desktop: icon + main-info + amount + actions (cùng 1 row). */}
            <div className="flex items-start gap-2.5">
              {/* Icon block */}
              <div
                className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white sm:size-12"
                style={{
                  backgroundColor:
                    row.category?.color ??
                    (row.type === 'income' ? '#7fb069' : '#ff4d4d'),
                }}
                aria-hidden="true"
              >
                {CatIcon ? (
                  <CatIcon className="size-5 sm:size-6" />
                ) : row.type === 'income' ? (
                  <ArrowDownLeft className="size-5 sm:size-6" />
                ) : (
                  <ArrowUpRight className="size-5 sm:size-6" />
                )}
              </div>

              {/* Main info — full width.
                  Mobile: name chiếm full row 1 (không truncate, không bị
                  amount đẩy); row 2 gom amount + badges cùng 1 dòng.
                  Desktop: name + meta + badges, amount render ở right column. */}
              <div className="min-w-0 flex-1">
                {/* Row 1 — name (full width, không share row với amount). */}
                <h3 className="font-heading text-sm font-bold uppercase leading-tight tracking-wide">
                  {row.category?.name ?? TYPE_META[rType].label()}
                </h3>

                {/* Row 2 — amount mobile cùng row với badges. Left: badges
                    (CHI/THU + frequency + paused). Right: amount (tabular-nums
                    đỏ/xanh). */}
                <div className="mt-1 flex items-center justify-between gap-2 sm:hidden">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={meta.badge} size="sm" className="px-1.5">
                      {meta.label()}
                    </Badge>
                    <Badge
                      variant={FREQUENCY_BADGE[row.frequency]}
                      size="sm"
                      className="px-1.5"
                    >
                      {FREQUENCY_LABELS[row.frequency]()}
                    </Badge>
                    {!row.is_active ? (
                      <Badge variant="outline" size="sm" className="px-1.5">
                        {m.recurring_paused_label()}
                      </Badge>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap font-heading text-sm font-bold tabular-nums ${meta.color}`}
                  >
                    {row.type === 'income' ? '+' : '−'}{' '}
                    {formatCurrency(Number(row.amount), row.account.currency_code)}
                  </span>
                </div>

                {/* Desktop: amount + actions render ở right column ngoài →
                    ở đây chỉ hiện badges row + meta row. */}
                <div className="mt-1 hidden flex-wrap items-center gap-1.5 sm:flex">
                  <Badge variant={meta.badge} size="sm" className="px-1.5">
                    {meta.label()}
                  </Badge>
                  <Badge
                    variant={FREQUENCY_BADGE[row.frequency]}
                    size="sm"
                    className="px-1.5"
                  >
                    {FREQUENCY_LABELS[row.frequency]()}
                  </Badge>
                  {!row.is_active ? (
                    <Badge variant="outline" size="sm" className="px-1.5">
                      {m.recurring_paused_label()}
                    </Badge>
                  ) : null}
                </div>

                {/* Row 3 (mobile) / Row 2 (desktop) — meta phụ: account + next_run. */}
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 truncate text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-flex size-3 shrink-0 items-center justify-center border border-border"
                      style={{ backgroundColor: row.account.color ?? '#64748b' }}
                    >
                      <AccIcon className="size-2 text-white" />
                    </span>
                    <span className="truncate">{row.account.name}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="whitespace-nowrap">
                    {m.recurring_next_label()}{' '}
                    <span className="font-medium text-foreground">{nextLabel}</span>
                  </span>
                  {row.end_date ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="whitespace-nowrap">
                        {m.recurring_until_label({
                          date: dateFmt.format(new Date(row.end_date)),
                        })}
                      </span>
                    </>
                  ) : null}
                </div>

                {row.note ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.note}
                  </p>
                ) : null}
              </div>

              {/* Amount — desktop bên phải (mobile đã inline ở trên). */}
              <div
                className={`hidden shrink-0 font-heading text-lg font-bold tabular-nums sm:block sm:text-right ${meta.color}`}
              >
                {row.type === 'income' ? '+' : '−'}{' '}
                {formatCurrency(Number(row.amount), row.account.currency_code)}
              </div>
            </div>

            {/* === Actions row ===
                Mobile: primary CTA "Sinh GD" full-width (nếu due) + dropdown
                  menu ⋮. Menu thu gọn để giảm noise + đỡ 3 button đen.
                Desktop: 3 buttons inline (giữ nguyên behavior). */}
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              {/* Mobile card view: primary CTA nổi bật + dropdown menu
                  cho phần còn lại. Desktop: 3 buttons inline. */}
              <div className="flex w-full items-center gap-2 md:w-auto">
                {/* Sinh GD — luôn render, disable khi chưa đến hạn hoặc
                    rule đang tạm dừng. Tooltip giải thích lý do thay cho
                    text "Đang chờ..." cũ để giữ layout cố định + feature
                    luôn visible (UI-UX ProMax). */}
                <Button
                  size="default"
                  variant="default"
                  className="h-10 flex-1 gap-1.5 sm:h-11 md:h-10 md:flex-none disabled:opacity-50"
                  onClick={() => handleGenerate(row.id)}
                  disabled={!canGenerate || isBusy || pending}
                  title={
                    !row.is_active
                      ? m.recurring_paused_label()
                      : !due
                        ? m.recurring_waiting_tooltip({ date: nextLabel })
                        : m.recurring_generate_aria()
                  }
                  aria-label={m.recurring_generate_aria()}
                >
                  <Zap className="size-4" /> {m.recurring_generate_btn_short()}
                </Button>

                {/* Mobile dropdown (ẩn ≥md) */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={m.accounts_actions_aria()}
                      />
                    }
                  >
                    <MoreVertical className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={
                        <RecurringForm
                          rule={row}
                          accounts={accounts}
                          categories={categories}
                          trigger="edit"
                        />
                      }
                    />
                    <DropdownMenuItem
                      onClick={() => handleToggle(row.id, !row.is_active)}
                      disabled={isBusy}
                    >
                      {row.is_active ? (
                        <>
                          <Pause className="size-4" /> {m.recurring_pause()}
                        </>
                      ) : (
                        <>
                          <Play className="size-4" /> {m.recurring_activate()}
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingId(row.id)}
                    >
                      <Trash2 className="size-4" /> {m.common_delete()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Desktop buttons (ẩn <md) */}
                <div className="hidden items-center gap-1.5 md:flex">
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

// Type-only refs for icons that may be inferred elsewhere; avoid dead-import warnings.
void Pencil;