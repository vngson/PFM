'use client';

// AccountList: client component cho phép edit/archive/delete ngay trong row.
// Neo-brutalism: icon box vuông + bordered table + uppercase small labels.
import { useState, useTransition } from 'react';
import { MoreHorizontal, Archive, Trash2, Wallet } from 'lucide-react';

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
import type { Account } from '@/types/database';
import { AccountForm } from './account-form';
import { archiveAccount, deleteAccount } from './actions';
import { notify } from '@/lib/toast';
import { formatCurrency } from '@/lib/format';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
        setDeleteId(null);
      } catch (e) {
        notify.error(e instanceof Error ? e.message : m.accounts_err_delete());
        setDeleteId(null);
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.accounts_table_name()}</TableHead>
          <TableHead>{m.accounts_table_type()}</TableHead>
          <TableHead className="text-right">{m.accounts_table_balance()}</TableHead>
          <TableHead className="w-16"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((acc) => {
          const Icon = getIcon(acc.icon_name);
          return (
            <TableRow key={acc.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center border-2 border-border text-white"
                    style={{ backgroundColor: acc.color ?? '#64748b' }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <span className="font-heading font-bold uppercase tracking-wide">{acc.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{TYPE_LABELS[acc.type]()}</Badge>
              </TableCell>
              <TableCell className="text-right font-heading text-base font-bold">
                {formatCurrency(acc.current_balance, acc.currency_code)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={m.accounts_actions_aria()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button> as React.ReactElement
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleArchive(acc.id)}>
                      <Archive className="size-4" /> {m.common_archive()}
                    </DropdownMenuItem>
                    <AlertDialog
                      open={deleteId === acc.id}
                      onOpenChange={(o) => setDeleteId(o ? acc.id : null)}
                    >
                      <AlertDialogTrigger
                        render={
                          <DropdownMenuItem variant="destructive">
                            <Trash2 className="size-4" /> {m.common_delete()}
                          </DropdownMenuItem> as React.ReactElement
                        }
                      />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{m.accounts_delete_title({ name: acc.name })}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.accounts_delete_desc()}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(acc.id)}
                            disabled={pending}
                          >
                            {pending ? m.common_deleting() : m.common_delete()}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {/* Edit dialog — render ngầm ở đây để trigger hoạt động */}
                    <div className="hidden">
                      <AccountForm account={acc} />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
