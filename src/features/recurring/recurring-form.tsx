'use client';

// RecurringForm: dialog tạo/sửa quy tắc giao dịch định kỳ.
// - Không support 'transfer' (DB constraint: recurring_no_transfer).
// - Frequency: daily / weekly / monthly / yearly.
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
import { notify } from '@/lib/toast';
import type { Account, Category, RecurringFrequency, RecurringTransaction } from '@/types/database';
import { createRecurring, updateRecurring, type ActionState } from './actions';
import { FREQUENCY_LABELS, todayIso } from './frequency';
import * as m from '@/paraglide/messages';

const TYPE_LABELS: Record<'income' | 'expense', () => string> = {
  income: () => m.transactions_type_income(),
  expense: () => m.transactions_type_expense(),
};

const TYPE_ITEMS: { value: 'income' | 'expense'; label: string }[] = (
  Object.keys(TYPE_LABELS) as Array<'income' | 'expense'>
).map((value) => ({ value, label: TYPE_LABELS[value]() }));

const FIRST_ACCOUNT = '__first__';

const initialState: ActionState = null;

interface CategoryOption {
  id: string;
  name: string;
  type: Category['type'];
  icon_name: string;
  color: string;
}

type RecurringType = 'income' | 'expense';

interface RecurringFormProps {
  rule?: RecurringTransaction;
  accounts: Pick<Account, 'id' | 'name' | 'currency_code' | 'color' | 'icon_name'>[];
  categories: CategoryOption[];
  trigger?: 'create' | 'edit';
}

export function RecurringForm({
  rule,
  accounts,
  categories,
  trigger = 'create',
}: RecurringFormProps) {
  const isEdit = !!rule;
  const action = isEdit
    ? updateRecurring.bind(null, rule!.id)
    : createRecurring;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<RecurringType>(
    (rule?.type as RecurringType) ?? 'expense',
  );
  const [accountId, setAccountId] = useState<string>(
    rule?.account_id ?? accounts[0]?.id ?? '',
  );
  const [categoryId, setCategoryId] = useState<string>(rule?.category_id ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    rule?.frequency ?? 'monthly',
  );
  const [intervalDays, setIntervalDays] = useState<string>(
    rule?.interval_days ? String(rule.interval_days) : '30',
  );

  // Shake animation khi có error
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

  // Filter category theo type (recurring chỉ có income/expense)
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [type, categories]);

  // Khi đổi type, reset category nếu không còn hợp lệ
  useEffect(() => {
    if (categoryId && !filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? '');
    }
  }, [type, filteredCategories, categoryId]);

  // Auto-close dialog + toast khi submit thành công
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(isEdit ? m.recurring_update_toast() : m.recurring_create_toast());
      });
    }
  }, [closeOnSuccess, isEdit]);

  const defaultStartDate = useMemo(() => {
    if (rule?.start_date) return rule.start_date.slice(0, 10);
    return todayIso();
  }, [rule]);

  const defaultEndDate = useMemo(() => {
    if (rule?.end_date) return rule.end_date.slice(0, 10);
    return '';
  }, [rule]);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  const triggerButton = isEdit ? (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="size-3.5" /> {m.common_edit()}
    </Button>
  ) : (
    <Button className="gap-1.5">
      <Plus className="size-4" /> {m.recurring_create_btn_form()}
    </Button>
  );

  const categoryValue = categoryId || FIRST_ACCOUNT;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerButton as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.recurring_form_edit_title() : m.recurring_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {m.recurring_page_subtitle()}
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
              <Label htmlFor="type">{m.recurring_form_type_label()}</Label>
              <Select
                name="type"
                items={TYPE_ITEMS}
                value={type}
                onValueChange={(v) => setType(v as RecurringType)}
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
              <Label htmlFor="account_id">{m.recurring_form_account_label()}</Label>
              <input type="hidden" name="account_id" value={accountId} />
              <Select
                value={accountId}
                items={accounts.map((a) => ({ value: a.id, label: a.name }))}
                onValueChange={(v) => v && setAccountId(v)}
              >
                <SelectTrigger id="account_id" className="w-full">
                  <SelectValue placeholder={m.recurring_form_account_label()} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {m.recurring_no_accounts()}
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

            <div className="space-y-2">
              <Label htmlFor="category_id">{m.recurring_form_category_label()}</Label>
              <input type="hidden" name="category_id" value={categoryId} />
              <Select
                value={categoryValue}
                items={[{ value: FIRST_ACCOUNT, label: m.recurring_no_category() }, ...filteredCategories.map((c) => ({ value: c.id, label: c.name }))]}
                onValueChange={(v) =>
                  v && setCategoryId(v === FIRST_ACCOUNT ? '' : v)
                }
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue placeholder={m.recurring_form_category_label()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FIRST_ACCOUNT}>{m.recurring_no_category()}</SelectItem>
                  {filteredCategories.length === 0 ? (
                    <SelectItem value="__empty_cat__" disabled>
                      {m.categories_no_categories_for_type({ type: TYPE_LABELS[type]() })}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">{m.recurring_form_amount_label()}</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={rule?.amount ?? ''}
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
                <Label htmlFor="frequency">{m.recurring_form_frequency_label()}</Label>
                <input
                  type="hidden"
                  name="frequency"
                  value={frequency}
                />
                <Select
                  value={frequency}
                  onValueChange={(v) => {
                    if (!v) return;
                    setFrequency(v as RecurringFrequency);
                  }}
                >
                  <SelectTrigger id="frequency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['daily', 'weekly', 'monthly', 'yearly', 'every_n_days'] as const).map(
                      (f) => (
                        <SelectItem key={f} value={f}>
                          {FREQUENCY_LABELS[f]()}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                {fieldError('frequency') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('frequency')}
                  </p>
                ) : null}
              </div>
            </div>

            {frequency === 'every_n_days' ? (
              <div className="space-y-2">
                <Label htmlFor="interval_days">{m.recurring_form_interval_label()}</Label>
                <Input
                  id="interval_days"
                  name="interval_days"
                  type="number"
                  min={1}
                  max={365}
                  step={1}
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(e.target.value)}
                  placeholder="30"
                  required
                />
                {fieldError('interval_days') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('interval_days')}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date">{m.recurring_form_start_label()}</Label>
                <DatePicker
                  id="start_date"
                  name="start_date"
                  defaultValue={defaultStartDate}
                  required
                  aria-invalid={Boolean(fieldError('start_date'))}
                  max={defaultEndDate || undefined}
                />
                {fieldError('start_date') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('start_date')}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">{m.recurring_form_end_label()}</Label>
                <DatePicker
                  id="end_date"
                  name="end_date"
                  defaultValue={defaultEndDate}
                  placeholder={m.recurring_end_placeholder()}
                  clearable
                  aria-invalid={Boolean(fieldError('end_date'))}
                  min={defaultStartDate || undefined}
                />
                {fieldError('end_date') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('end_date')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">{m.recurring_form_note_label()}</Label>
              <Input
                id="note"
                name="note"
                defaultValue={rule?.note ?? ''}
                placeholder={m.recurring_form_note_label()}
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