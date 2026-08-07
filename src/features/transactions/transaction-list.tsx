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
  MoreHorizontal,
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
  AlertDialogTrigger,
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
}

export function TransactionList({
  transactions,
  accounts,
  categories,
  isFiltered = false,
  clearHref = '/transactions',
}: TransactionListProps) {
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Group theo ngày
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Row[]>();
    for (const row of transactions) {
      const d = row.occurred_at.slice(0, 10);
      const arr = map.get(d);
      if (arr) arr.push(row);
      else map.set(d, [row]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, rows]) => ({ date, rows }));
  }, [transactions]);

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        notify.success(m.transactions_delete_toast());
        setDeleteId(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.transactions_err_delete());
        setDeleteId(null);
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
          <div className="flex items-center justify-between border-b-2 border-border bg-secondary px-4 py-2">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {dateFmt.format(new Date(group.date))}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {m.transactions_count_in_group({ count: group.rows.length })}
            </span>
          </div>
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
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading text-sm font-bold uppercase tracking-wide">
                              {row.category?.name ?? TYPE_META[row.type].label()}
                            </span>
                            <Badge variant={meta.badge}>{meta.label()}</Badge>
                          </div>
                          {row.note ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {row.note}
                            </p>
                          ) : null}
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
                    <TableCell className="w-12">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label={m.accounts_actions_aria()}>
                              <MoreHorizontal className="size-4" />
                            </Button> as React.ReactElement
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingId(row.id)}>
                            <Pencil className="size-4" /> {m.common_edit()}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="size-4" /> {m.common_delete()}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialog
                        open={deleteId === row.id}
                        onOpenChange={(o) => setDeleteId(o ? row.id : null)}
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
                              onClick={() => handleDelete(row.id)}
                              disabled={pending}
                            >
                              {pending ? m.common_deleting() : m.common_delete()}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      {/* Edit form mở qua state lifting */}
      {editingId
        ? (() => {
            const editRow = transactions.find((t) => t.id === editingId);
            if (!editRow) return null;
            return (
              <TransactionForm
                key={editRow.id}
                transaction={editRow}
                accounts={accounts}
                categories={categories}
                trigger="hidden"
                open
                onOpenChange={(o) => {
                  if (!o) setEditingId(null);
                }}
              />
            );
          })()
        : null}
    </div>
  );
}
