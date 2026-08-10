'use client';

// TransferForm: dialog chuyển tiền giữa 2 account của cùng user.
// Submit tạo 2 transactions (expense từ from + income vào to).
//
// UX:
// - User chọn From account và To account (cash/bank đều OK, trừ cash → cash).
// - Nhập amount, DatePicker mặc định hôm nay, note optional.
// - Validation: from !== to (server), cash → cash (server), amount > 0.
// - Khi chọn from = account X, dropdown "to" hiển thị tất cả account khác X.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getIcon } from '@/features/categories/icon-catalog';
import { useDialogFormState } from '@/lib/hooks/use-dialog-form-state';
import type { Account } from '@/types/database';
import { createTransfer, type ActionState } from './actions';
import * as m from '@/paraglide/messages';

const FIRST_ACCOUNT = '__first__';

const initialState: ActionState = null;

interface TransferFormProps {
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'>[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const formatVnd = (n: number): string =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export function TransferForm({ accounts }: TransferFormProps) {
  const action = createTransfer;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [fromId, setFromId] = useState<string>(accounts[0]?.id ?? '');
  const [toId, setToId] = useState<string>(accounts[1]?.id ?? '');
  const [amount, setAmount] = useState<string>('');
  const [occurredAt, setOccurredAt] = useState<string>(todayIso());

  // To-dropdown: loại trừ account đang chọn làm from.
  const toOptions = useMemo(
    () => accounts.filter((a) => a.id !== fromId),
    [accounts, fromId],
  );

  // Mở dialog: reset form về giá trị mặc định. Event-driven, không dùng useEffect.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setFromId(accounts[0]?.id ?? '');
      setToId(accounts[1]?.id ?? '');
      setAmount('');
      setOccurredAt(todayIso());
    }
    setOpen(next);
  };

  // Auto-close dialog khi submit thành công (useDialogFormState detect pending flip + null state).
  // Pattern giống account-form/transaction-form: setOpen(false) trong effect để match với lifecycle
  // của useActionState. KHÔNG dùng derived isOpen = open && !closeOnSuccess — setTimeout(0) reset
  // của hook sẽ ngay lập tức đảo closeOnSuccess về false, làm isOpen flip true → dialog bật lại.
  useEffect(() => {
    if (closeOnSuccess) setOpen(false);
  }, [closeOnSuccess]);

  // Shake khi có error (giống các form khác trong codebase).
  useEffect(() => {
    if (state?.error || (state?.fieldErrors && Object.keys(state.fieldErrors).length > 0)) {
      const el = formRef.current;
      if (!el) return;
      el.classList.remove('animate-brutal-shake');
      void el.offsetWidth;
      el.classList.add('animate-brutal-shake');
      const t = setTimeout(() => el.classList.remove('animate-brutal-shake'), 450);
      return () => clearTimeout(t);
    }
  }, [state]);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  const triggerButton = (
    <Button variant="outline" className="gap-1.5">
      <ArrowLeftRight className="size-4" /> {m.transfer_create_btn()}
    </Button>
  );

  const noAccounts = accounts.length < 2;
  const amountNum = Number(amount) || 0;
  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerButton as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.transfer_form_title()}</DialogTitle>
          <DialogDescription>{m.transfer_form_desc()}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction}>
          <div className="space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="from_account_id">{m.transfer_from_label()}</Label>
              <input type="hidden" name="from_account_id" value={fromId} />
              <Select
                value={fromId || FIRST_ACCOUNT}
                items={[
                  { value: FIRST_ACCOUNT, label: m.transfer_from_placeholder() },
                  ...accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onValueChange={(v) => v && v !== FIRST_ACCOUNT && setFromId(v)}
              >
                <SelectTrigger id="from_account_id" className="w-full">
                  <SelectValue placeholder={m.transfer_from_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => {
                    const Icon = getIcon(acc.icon_name ?? '');
                    return (
                      <SelectItem key={acc.id} value={acc.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex size-4 shrink-0 items-center justify-center border border-border text-white"
                            style={{ backgroundColor: acc.color ?? '#64748b' }}
                          >
                            <Icon className="size-3" />
                          </span>
                          <span>{acc.name}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {fieldError('from_account_id') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('from_account_id')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="to_account_id">{m.transfer_to_label()}</Label>
              <input type="hidden" name="to_account_id" value={toId} />
              <Select
                value={toId || FIRST_ACCOUNT}
                items={[
                  { value: FIRST_ACCOUNT, label: m.transfer_to_placeholder() },
                  ...toOptions.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onValueChange={(v) => v && v !== FIRST_ACCOUNT && setToId(v)}
              >
                <SelectTrigger id="to_account_id" className="w-full">
                  <SelectValue placeholder={m.transfer_to_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {toOptions.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {m.transfer_to_placeholder()}
                    </SelectItem>
                  ) : (
                    toOptions.map((acc) => {
                      const Icon = getIcon(acc.icon_name ?? '');
                      return (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-flex size-4 shrink-0 items-center justify-center border border-border text-white"
                              style={{ backgroundColor: acc.color ?? '#64748b' }}
                            >
                              <Icon className="size-3" />
                            </span>
                            <span>{acc.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {fieldError('to_account_id') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('to_account_id')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{m.transfer_amount_label()}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="1000"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
              {fieldError('amount') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('amount')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurred_at">{m.transactions_form_date_label()}</Label>
              <DatePicker
                id="occurred_at"
                name="occurred_at"
                defaultValue={occurredAt}
                required
                aria-invalid={Boolean(fieldError('occurred_at'))}
              />
              {fieldError('occurred_at') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('occurred_at')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{m.transactions_form_note_label()}</Label>
              <Input
                id="note"
                name="note"
                placeholder={m.transfer_note_placeholder()}
                maxLength={200}
              />
              {fieldError('note') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('note')}
                </p>
              ) : null}
            </div>

            {/* Preview (read-only) */}
            {fromAcc && toAcc && amountNum > 0 ? (
              <div className="border-2 border-border bg-secondary/30 p-3">
                <div className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {m.transfer_form_title()}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold">{formatVnd(amountNum)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{fromAcc.name}</span>
                  <ArrowLeftRight className="size-3" />
                  <span>{toAcc.name}</span>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {m.common_cancel()}
            </Button>
            <Button
              type="submit"
              disabled={pending || noAccounts || amountNum <= 0}
            >
              {pending ? m.common_saving() : m.transfer_create_btn()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
