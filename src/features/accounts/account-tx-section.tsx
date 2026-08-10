// AccountTxSection: bảng giao dịch cho account detail.
// - Group theo ngày (occurred_at)
// - Mỗi row: icon category (hoặc transfer), tên category, note (nếu có), số tiền
// - Không có action Sửa/Xoá ở đây — user navigate sang /transactions để sửa.
//   Lý do: tránh 2 nơi cùng sửa 1 transaction, giữ single source of truth.
// - Load more: Link với ?before=YYYY-MM-DD của row cuối (cursor pagination,
//   tận dụng listTransactions có sẵn).
import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  ChevronDown,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getIcon } from '@/features/categories/icon-catalog';
import { formatCurrency, getNumberLocale } from '@/lib/format';
import * as m from '@/paraglide/messages';

type Row = {
  id: string;
  occurred_at: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  note: string | null;
  category: { id: string; name: string; icon_name: string; color: string; type: 'income' | 'expense' } | null;
};

interface AccountTxSectionProps {
  transactions: Row[];
  currencyCode: string;
  nextBefore: string | undefined;
  hasMore: boolean;
}

export function AccountTxSection({
  transactions,
  currencyCode,
  nextBefore,
  hasMore,
}: AccountTxSectionProps) {
  // Group by occurred_at (YYYY-MM-DD), giữ thứ tự desc theo ngày.
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const t of transactions) {
      const key = t.occurred_at.slice(0, 10);
      const arr = map.get(key);
      if (arr) arr.push(t);
      else map.set(key, [t]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transactions]);

  const dateFmt = new Intl.DateTimeFormat(getNumberLocale(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (transactions.length === 0) {
    return (
      <div className="border-2 border-dashed border-border bg-muted/40 p-8 text-center">
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center border-2 border-border bg-secondary">
          <Receipt className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{m.account_detail_no_transactions()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([day, rows]) => (
        <div key={day} className="border-2 border-border bg-card">
          <div className="flex items-center justify-between border-b-2 border-border bg-secondary px-4 py-2">
            <span className="font-heading text-xs font-bold uppercase tracking-wider">
              {dateFmt.format(new Date(day))}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{rows.length}</span>
          </div>
          <Table>
            <TableBody>
              {rows.map((t) => {
                const CatIcon = t.category ? getIcon(t.category.icon_name) : null;
                const color =
                  t.type === 'income'
                    ? '#7fb069'
                    : t.type === 'expense'
                      ? '#ff4d4d'
                      : '#64748b';
                return (
                  <TableRow key={t.id}>
                    <TableCell className="w-12">
                      <div
                        className="flex size-9 items-center justify-center border-2 border-border text-white"
                        style={{ backgroundColor: t.category?.color ?? color }}
                      >
                        {CatIcon ? (
                          <CatIcon className="size-4" />
                        ) : t.type === 'income' ? (
                          <ArrowDownLeft className="size-4" />
                        ) : t.type === 'expense' ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ArrowLeftRight className="size-4" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-heading text-sm font-bold uppercase tracking-wide">
                        {t.category?.name ??
                          (t.type === 'transfer' ? m.transactions_type_transfer() : m.recurring_type_income())}
                      </div>
                      {t.note ? (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.note}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-heading text-base font-bold">
                      <span
                        className={
                          t.type === 'income'
                            ? 'text-income'
                            : t.type === 'expense'
                              ? 'text-expense'
                              : 'text-foreground'
                        }
                      >
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '−' : '⇄'}
                        {' '}
                        {formatCurrency(t.amount, currencyCode)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      {hasMore && nextBefore ? (
        <div className="flex justify-center pt-2">
          <Button
            render={
              <Link
                href={`?before=${nextBefore}`}
                aria-label={m.account_detail_load_more_aria()}
                className="inline-flex items-center gap-1.5"
                scroll={false}
              />
            }
          >
            <ChevronDown className="size-4" />
            {m.account_detail_load_more_label()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}