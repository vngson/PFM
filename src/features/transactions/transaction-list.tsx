'use client';

// TransactionList: bảng giao dịch.
// - Group theo ngày (occurred_at)
// - Mỗi row hiển thị: icon category (hoặc transfer), tên category, tên tài khoản,
//   note (nếu có), số tiền (+ cho income, − cho expense, ⇄ cho transfer)
// - Dropdown action: sửa + xoá
// Neo-brutalism: border + shadow + accent màu theo type.
import { useMemo, useState, useTransition } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  MoreVertical,
  Trash2,
  Pencil,
  Receipt,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
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
import type { Transaction } from '@/types/database';
import { TransactionForm } from './transaction-form';
import { deleteTransaction } from './actions';
import { notify } from '@/lib/toast';
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

type Row = Transaction & {
  account: AccountLite;
  category: CategoryLite | null;
};

const TYPE_META: Record<
  Transaction['type'],
  { label: () => string; color: string; badge: 'income' | 'expense' | 'secondary' }
> = {
  income: { label: () => m.transactions_type_income(), color: 'text-income', badge: 'income' },
  expense: { label: () => m.transactions_type_expense(), color: 'text-expense', badge: 'expense' },
  transfer: { label: () => m.transactions_type_transfer(), color: 'text-muted-foreground', badge: 'secondary' },
};

interface TransactionListProps {
  transactions: Row[];
  accounts: AccountLite[];
  categories: CategoryLite[];
  /** Đang trong chế độ filter (chip type hoặc search)? */
  isFiltered?: boolean;
  /** URL để clear filter — dùng khi empty state. */
  clearHref?: string;
}

interface Group {
  date: string;
  rows: Row[];
  income: number;
  expense: number;
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  isFiltered = false,
  clearHref = '/transactions',
}: TransactionListProps) {
  const [pending, startTransition] = useTransition();
  // Lưu cả object (không chỉ id) để lookup không bị stale khi list re-render.
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Group theo ngày + tính tổng thu/chi theo ngày để hiển thị trên header.
  // Transfer không tính vào income/expense (đã là dòng trung chuyển giữa 2 account của cùng user).
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, { rows: Row[]; income: number; expense: number }>();
    for (const row of transactions) {
      const d = row.occurred_at.slice(0, 10);
      const bucket = map.get(d) ?? { rows: [], income: 0, expense: 0 };
      bucket.rows.push(row);
      if (row.type === 'income') bucket.income += Number(row.amount);
      else if (row.type === 'expense') bucket.expense += Number(row.amount);
      map.set(d, bucket);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, bucket]) => ({
        date,
        rows: bucket.rows,
        income: bucket.income,
        expense: bucket.expense,
      }));
  }, [transactions]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        notify.success(m.transactions_delete_toast());
        setDeletingTransaction(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.transactions_err_delete());
        setDeletingTransaction(null);
      }
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-10 text-center">
        <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center border-2 border-border bg-secondary">
          <Receipt className="size-6" />
        </div>
        <p className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {m.transactions_empty_title()}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {isFiltered ? (
            <>
              {m.transactions_empty_filtered_desc()}{' '}
              <a
                href={clearHref}
                className="font-bold text-foreground underline decoration-2 underline-offset-2"
              >
                {m.transactions_filter_clear_link()}
              </a>
            </>
          ) : (
            m.transactions_empty_unfiltered_desc()
          )}
        </p>
      </div>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(getNumberLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.date}
          className="border-2 border-border bg-card shadow-brutal-sm"
        >
          <div className="flex flex-col gap-1 border-b-2 border-border bg-secondary px-4 py-2 md:flex-row md:items-center md:justify-between md:gap-0">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {dateFmt.format(new Date(group.date))}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {m.transactions_group_day_summary({
                count: group.rows.length,
                income: formatCurrency(group.income, 'VND'),
                expense: formatCurrency(group.expense, 'VND'),
              })}
            </span>
          </div>

          {/* Mobile card view (<md) — 3 rows, icon gọn (24px) để nhường chỗ
              cho Amount + ⋮ cùng dòng (row 1) mà không che nhau. */}
          <div className="space-y-2 p-2 md:hidden">
            {group.rows.map((row) => {
              const meta = TYPE_META[row.type];
              const CatIcon = row.category ? getIcon(row.category.icon_name) : null;
              const AccIcon = getIcon(row.account.icon_name ?? '');
              const sign = row.type === 'income' ? '+' : row.type === 'expense' ? '−' : '⇄';
              const fallbackColor =
                row.type === 'income' ? '#7fb069' : row.type === 'expense' ? '#ff4d4d' : '#64748b';
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] gap-x-2 gap-y-1.5 border-2 border-border bg-card p-3 shadow-brutal-sm"
                >
                  {/* Row 1-3 — Icon (col 1, row-span 3) — 24px gọn */}
                  <div
                    className="row-span-3 flex size-6 shrink-0 items-center justify-center border-2 border-border text-white"
                    style={{ backgroundColor: row.category?.color ?? fallbackColor }}
                    aria-hidden="true"
                  >
                    {CatIcon ? (
                      <CatIcon className="size-3" />
                    ) : row.type === 'transfer' ? (
                      <ArrowLeftRight className="size-3" />
                    ) : row.type === 'income' ? (
                      <ArrowDownLeft className="size-3" />
                    ) : (
                      <ArrowUpRight className="size-3" />
                    )}
                  </div>

                  {/* Row 1 — Name + Badge (col 2) + Amount + ⋮ (col 3, cùng dòng) */}
                  <div className="col-start-2 flex min-w-0 items-center gap-x-2 gap-y-0.5 pr-1">
                    <span className="truncate font-heading text-sm font-bold uppercase tracking-wide">
                      {row.category?.name ?? TYPE_META[row.type].label()}
                    </span>
                    <Badge variant={meta.badge} className="shrink-0">{meta.label()}</Badge>
                  </div>

                  {/* Amount — col 3 row 1, cùng dòng với Name+Badge nhưng
                       nằm riêng cột phải để ⋮ có chỗ đứng kế bên. */}
                  <div className="col-start-3 row-start-1 flex items-center gap-1 whitespace-nowrap">
                    <span
                      className={`font-heading text-sm font-bold tabular-nums ${meta.color}`}
                    >
                      {sign} {formatCurrency(row.amount, row.account.currency_code)}
                    </span>
                    {/* ⋮ — ghost (không border, không bg) cùng row với amount.
                         size 7 để không chiếm quá nhiều chỗ nhưng vẫn ≥28px touch. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={m.accounts_actions_aria()}
                            className="size-7 min-h-7 min-w-7 text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTransaction(row)}>
                          <Pencil className="size-4" /> {m.common_edit()}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeletingTransaction(row)}
                        >
                          <Trash2 className="size-4" /> {m.common_delete()}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Row 2 — Source (account). col-start-2 (cùng cột với text dòng 1)
                       + pl-7 = width icon box (size-6 24px + border-2 mỗi bên = 28px)
                       → text "Momo - Quỹ" bắt đầu ở mép phải icon (thẳng hàng icon).
                       min-h giữ chiều cao ổn định dù account name ngắn hay dài. */}
                  <span className="col-span-2 col-start-2 row-start-2 inline-flex min-h-4 items-center truncate pl-0 text-xs text-muted-foreground">
                    {row.account.name}
                  </span>

                  {/* Row 3 — Description. Cùng left-edge với row 2
                       (thẳng hàng icon), row 3 đúng vị trí. min-h giữ
                       card đều chiều cao dù có note hay không. */}
                  <p className="col-span-2 col-start-2 row-start-3 min-h-4 truncate pl-0 text-xs italic text-muted-foreground">
                    {row.note ?? ''}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Desktop table view (≥md) */}
          <div className="hidden md:block">
            <Table>
              <TableBody>
                {group.rows.map((row) => {
                  const meta = TYPE_META[row.type];
                  const CatIcon = row.category ? getIcon(row.category.icon_name) : null;
                  const AccIcon = getIcon(row.account.icon_name ?? '');
                  const sign = row.type === 'income' ? '+' : row.type === 'expense' ? '−' : '⇄';
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                            style={{
                              backgroundColor:
                                row.category?.color ??
                                (row.type === 'income' ? '#7fb069' : row.type === 'expense' ? '#ff4d4d' : '#64748b'),
                            }}
                            aria-hidden="true"
                          >
                            {CatIcon ? (
                              <CatIcon className="size-5" />
                            ) : row.type === 'transfer' ? (
                              <ArrowLeftRight className="size-5" />
                            ) : row.type === 'income' ? (
                              <ArrowDownLeft className="size-5" />
                            ) : (
                              <ArrowUpRight className="size-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-heading text-sm font-bold uppercase tracking-wide">
                                {row.category?.name ?? TYPE_META[row.type].label()}
                              </span>
                              <Badge variant={meta.badge}>{meta.label()}</Badge>
                              {row.note ? (
                                <>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs italic text-muted-foreground">
                                    {row.note}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                className="inline-flex size-3 shrink-0 items-center justify-center border border-border"
                                style={{ backgroundColor: row.account.color ?? '#64748b' }}
                              >
                                <AccIcon className="size-2 text-white" />
                              </span>
                              {row.account.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-heading text-base font-bold ${meta.color}`}>
                        {sign} {formatCurrency(row.amount, row.account.currency_code)}
                      </TableCell>
                      <TableCell className="w-28 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={m.accounts_actions_aria()}
                            onClick={() => setEditingTransaction(row)}
                          >
                            <Pencil className="size-3.5" /> {m.common_edit()}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={m.accounts_actions_aria()}
                            onClick={() => setDeletingTransaction(row)}
                            data-destructive="true"
                          >
                            <Trash2 className="size-3.5" /> {m.common_delete()}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {/* Edit form mở qua state lifting */}
      <TransactionForm
        key={editingTransaction?.id ?? 'closed'}
        transaction={editingTransaction ?? undefined}
        accounts={accounts}
        categories={categories}
        trigger="hidden"
        open={editingTransaction !== null}
        onOpenChange={(o) => {
          if (!o) setEditingTransaction(null);
        }}
      />

      {/* Delete confirm — render 1 lần ở root để tránh bị Base UI Menu đóng gây unmount */}
      <AlertDialog
        open={deletingTransaction !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingTransaction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.transactions_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.transactions_delete_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingTransaction) handleDelete(deletingTransaction.id);
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
