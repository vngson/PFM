'use client';

// AccountList: client component cho phép edit/archive/delete ngay trong row.
// Click row → navigate sang /accounts/[id] để xem chi tiết + lịch sử giao dịch.
// Actions (Sửa / Lưu trữ / Xoá) gọi stopPropagation để không trigger navigation.
// Neo-brutalism: icon box vuông + bordered table + uppercase small labels.
import { useState, useTransition } from 'react';
import { Archive, MoreVertical, Trash2, Pencil, Wallet } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ListCard,
  ListCardHeader,
  ListCardFooter,
} from '@/components/ui/list-card';
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
import type { Account } from '@/types/database';
import { AccountForm } from './account-form';
import { archiveAccount, deleteAccount } from './actions';
import { notify } from '@/lib/toast';
import { formatCurrency } from '@/lib/format';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const TYPE_LABELS: Record<Account['type'], () => string> = {
  cash: () => m.accounts_type_cash(),
  bank: () => m.accounts_type_bank(),
  credit_card: () => m.accounts_type_credit_card(),
  e_wallet: () => m.accounts_type_e_wallet(),
  savings: () => m.accounts_type_savings(),
  investment: () => m.accounts_type_investment(),
  other: () => m.accounts_type_other(),
};

interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  const [pending, startTransition] = useTransition();
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleArchive = (id: string) => {
    startTransition(async () => {
      try {
        await archiveAccount(id);
        notify.success(m.accounts_archive_toast());
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.accounts_err_archive());
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteAccount(id);
        notify.success(m.accounts_delete_toast());
        setDeletingAccount(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.accounts_err_delete());
        setDeletingAccount(null);
      }
    });
  };

  if (accounts.length === 0) {
    return (
      <div className="border-2 border-dashed border-border p-10 text-center">
        <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center border-2 border-border bg-secondary">
          <Wallet className="size-6" />
        </div>
        <p className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {m.accounts_empty_title()}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {m.accounts_empty_short_desc()}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card view (<md) */}
      <div className="space-y-2 md:hidden">
        {accounts.map((acc) => {
          const Icon = getIcon(acc.icon_name);
          return (
            <ListCard key={acc.id}>
              <ListCardHeader>
                <Link
                  href={buildLocalizedHref(`/accounts/${acc.id}`, getLocale())}
                  className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                    style={{ backgroundColor: acc.color ?? '#64748b' }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-heading font-bold uppercase tracking-wide">
                      {acc.name}
                    </span>
                    <Badge variant="secondary" className="mt-0.5">{TYPE_LABELS[acc.type]()}</Badge>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={m.accounts_actions_aria()}
                      />
                    }
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingAccount(acc)}>
                      <Pencil className="size-4" /> {m.common_edit()}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(acc.id)}>
                      <Archive className="size-4" /> {m.common_archive()}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingAccount(acc)}
                    >
                      <Trash2 className="size-4" /> {m.common_delete()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListCardHeader>
              <ListCardFooter>
                <Link
                  href={buildLocalizedHref(`/accounts/${acc.id}`, getLocale())}
                  className="block focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-heading text-base font-bold">
                    {formatCurrency(acc.current_balance, acc.currency_code)}
                  </span>
                </Link>
              </ListCardFooter>
            </ListCard>
          );
        })}
      </div>

      {/* Desktop table view (≥md) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.accounts_table_name()}</TableHead>
              <TableHead>{m.accounts_table_type()}</TableHead>
              <TableHead className="text-right">{m.accounts_table_balance()}</TableHead>
              <TableHead className="w-44 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((acc) => {
              const Icon = getIcon(acc.icon_name);
              return (
                <TableRow key={acc.id} className="group">
                  <TableCell>
                    <Link
                      href={buildLocalizedHref(`/accounts/${acc.id}`, getLocale())}
                      className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div
                        className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                        style={{ backgroundColor: acc.color ?? '#64748b' }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="font-heading font-bold uppercase tracking-wide group-hover:underline">
                        {acc.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={buildLocalizedHref(`/accounts/${acc.id}`, getLocale())}
                      className="inline-block focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={TYPE_LABELS[acc.type]()}
                    >
                      <Badge variant="secondary">{TYPE_LABELS[acc.type]()}</Badge>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-heading text-base font-bold">
                    <Link
                      href={buildLocalizedHref(`/accounts/${acc.id}`, getLocale())}
                      className="block focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {formatCurrency(acc.current_balance, acc.currency_code)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={m.accounts_actions_aria()}
                        onClick={() => setEditingAccount(acc)}
                      >
                        <Pencil className="size-3.5" /> {m.common_edit()}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={m.accounts_actions_aria()}
                        onClick={() => handleArchive(acc.id)}
                      >
                        <Archive className="size-3.5" /> {m.common_archive()}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={m.accounts_actions_aria()}
                        onClick={() => setDeletingAccount(acc)}
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

      <AccountForm
        key={editingAccount?.id ?? 'closed'}
        account={editingAccount ?? undefined}
        open={editingAccount !== null}
        onOpenChange={(o) => {
          if (!o) setEditingAccount(null);
        }}
        hideTrigger
      />

      {/* Delete confirm mount 1 lần ở root, không bên trong dropdown — tránh
          Dialog unmount khi Menu đóng. */}
      <AlertDialog
        open={deletingAccount !== null}
        onOpenChange={(o) => {
          if (!o) setDeletingAccount(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingAccount
                ? m.accounts_delete_title({ name: deletingAccount.name })
                : m.accounts_delete_title({ name: '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.accounts_delete_desc()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingAccount) handleDelete(deletingAccount.id);
              }}
              disabled={pending}
            >
              {pending ? m.common_deleting() : m.common_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
