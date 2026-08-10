'use client';

// TransactionForm: dialog tạo/sửa giao dịch.
// - Loại (income/expense/transfer) → filter category tương ứng (transfer = no category)
// - Select account + category + amount + date + note
// Submit qua Server Action, hiển thị lỗi qua useActionState + form shake animation.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';

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
import type { Account, Category, Transaction } from '@/types/database';
import {
  createTransaction,
  updateTransaction,
  type ActionState,
} from './actions';
import * as m from '@/paraglide/messages';

const TYPE_LABELS: Record<Transaction['type'], () => string> = {
  income: () => m.transactions_type_income(),
  expense: () => m.transactions_type_expense(),
  transfer: () => m.transactions_type_transfer(),
};

const TYPE_ITEMS: { value: Transaction['type']; label: string }[] = (
  Object.entries(TYPE_LABELS) as [Transaction['type'], () => string][]
).map(([value, getLabel]) => ({ value, label: getLabel() }));

// Tài khoản đầu tiên trong list dùng làm fallback khi không có default.
const FIRST_ACCOUNT = '__first__';

const initialState: ActionState = null;

interface CategoryOption {
  id: string;
  name: string;
  type: Category['type'];
  icon_name: string;
  color: string;
}

interface TransactionFormProps {
  transaction?: Transaction;
  accounts: Pick<Account, 'id' | 'name' | 'currency_code' | 'color' | 'icon_name'>[];
  categories: CategoryOption[];
  trigger?: 'create' | 'edit' | 'hidden';
  /** Controlled open. Nếu không truyền thì form tự quản lý. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransactionForm({
  transaction,
  accounts,
  categories,
  trigger = 'create',
  open: openProp,
  onOpenChange,
}: TransactionFormProps) {
  const isEdit = !!transaction;
  const action = isEdit
    ? updateTransaction.bind(null, transaction!.id)
    : createTransaction;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  };
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<Transaction['type']>(transaction?.type ?? 'expense');
  const [accountId, setAccountId] = useState<string>(
    transaction?.account_id ?? accounts[0]?.id ?? '',
  );
  const [categoryId, setCategoryId] = useState<string>(transaction?.category_id ?? '');

  // Shake animation khi có error (giống auth form)
  useEffect(() => {
    if (state?.error || (state?.fieldErrors && Object.keys(state.fieldErrors).length > 0)) {
      const el = formRef.current;
      if (!el) return;
      el.classList.remove('animate-brutal-shake');
      void el.offsetWidth; // restart animation
      el.classList.add('animate-brutal-shake');
      const t = setTimeout(() => el.classList.remove('animate-brutal-shake'), 450);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Auto-close dialog khi submit thành công
  useEffect(() => {
    if (closeOnSuccess) setOpen(false);
  }, [closeOnSuccess]);

  // Filter category theo type (transfer không cần)
  const filteredCategories = useMemo(() => {
    if (type === 'transfer') return [] as CategoryOption[];
    return categories.filter((c) => c.type === type);
  }, [type, categories]);

  // Khi đổi type, reset category nếu không còn hợp lệ
  useEffect(() => {
    if (type === 'transfer') {
      setCategoryId('');
    } else if (categoryId && !filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? '');
    }
  }, [type, filteredCategories, categoryId]);

  // occurred_at: mặc định hôm nay (YYYY-MM-DD)
  const defaultDate = useMemo(() => {
    const v = transaction?.occurred_at ?? '';
    if (v) return v.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }, [transaction]);

  // Reset state khi edit form mở với transaction mới (parent dùng key remount)
  useEffect(() => {
    if (open && transaction) {
      setType(transaction.type);
      setAccountId(transaction.account_id);
      setCategoryId(transaction.category_id ?? '');
    }
  }, [open, transaction]);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  const triggerButton = isEdit ? (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="size-3.5" /> {m.common_edit()}
    </Button>
  ) : (
    <Button className="gap-1.5">
      <Plus className="size-4" /> {m.transactions_create_btn_short()}
    </Button>
  );

  const categoryValue = categoryId || FIRST_ACCOUNT;

  const showTrigger = trigger !== 'hidden';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger render={triggerButton as React.ReactElement} />
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.transactions_form_edit_title() : m.transactions_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {m.transactions_page_subtitle()}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction}>
          <div className="space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="type">{m.transactions_form_type_label()}</Label>
              <Select
                name="type"
                items={TYPE_ITEMS}
                value={type}
                onValueChange={(v) => setType(v as Transaction['type'])}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError('type') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('type')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_id">{m.transactions_form_account_label()}</Label>
              <input type="hidden" name="account_id" value={accountId} />
              <Select
                value={accountId}
                items={accounts.map((a) => ({ value: a.id, label: a.name }))}
                onValueChange={(v) => v && setAccountId(v)}
              >
                <SelectTrigger id="account_id" className="w-full">
                  <SelectValue placeholder={m.transactions_form_account_label()} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {m.transactions_form_no_accounts()}
                    </SelectItem>
                  ) : (
                    accounts.map((acc) => {
                      const Icon = getIcon(acc.icon_name ?? '');
                      return (
                        <SelectItem key={acc.id} value={acc.id}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-flex size-4 shrink-0 items-center justify-center border border-border"
                              style={{ backgroundColor: acc.color ?? '#64748b' }}
                            >
                              <Icon className="size-3 text-white" />
                            </span>
                            <span>{acc.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {fieldError('account_id') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('account_id')}
                </p>
              ) : null}
            </div>

            {type !== 'transfer' ? (
              <div className="space-y-2">
                <Label htmlFor="category_id">{m.transactions_form_category_label()}</Label>
                <input
                  type="hidden"
                  name="category_id"
                  value={categoryId}
                />
                <Select value={categoryValue} items={[{ value: FIRST_ACCOUNT, label: m.transactions_no_category() }, ...filteredCategories.map((c) => ({ value: c.id, label: c.name }))]} onValueChange={(v) => v && setCategoryId(v === FIRST_ACCOUNT ? '' : v)}>
                  <SelectTrigger id="category_id" className="w-full">
                    <SelectValue placeholder={m.transactions_form_category_label()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FIRST_ACCOUNT}>{m.transactions_no_category()}</SelectItem>
                    {filteredCategories.length === 0 ? (
                      <SelectItem value="__empty_cat__" disabled>
                        {m.categories_no_categories_for_type({ type: TYPE_LABELS[type]().toLowerCase() })}
                      </SelectItem>
                    ) : (
                      filteredCategories.map((cat) => {
                        const Icon = getIcon(cat.icon_name);
                        return (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-flex size-4 shrink-0 items-center justify-center border border-border text-white"
                                style={{ backgroundColor: cat.color }}
                              >
                                <Icon className="size-3" />
                              </span>
                              <span>{cat.name}</span>
                            </span>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {fieldError('category_id') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('category_id')}
                  </p>
                ) : null}
              </div>
            ) : (
              // Vẫn cần submit name=category_id với empty cho transfer; hidden input đã được reset ở effect.
              <input type="hidden" name="category_id" value="" />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">{m.transactions_form_amount_label()}</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={transaction?.amount ?? ''}
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
                  defaultValue={defaultDate}
                  required
                  aria-invalid={Boolean(fieldError('occurred_at'))}
                />
                {fieldError('occurred_at') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('occurred_at')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{m.transactions_form_note_label()}</Label>
              <Input
                id="note"
                name="note"
                defaultValue={transaction?.note ?? ''}
                placeholder={m.transactions_form_note_placeholder()}
                maxLength={200}
              />
              {fieldError('note') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('note')}
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={pending || accounts.length === 0}>
              {pending ? m.common_saving() : isEdit ? m.common_update() : m.common_create()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
