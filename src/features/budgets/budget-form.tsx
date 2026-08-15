'use client';

// BudgetForm: dialog tạo/sửa ngân sách cho 1 category trong 1 tháng.
// - period_month: YYYY-MM (UI) → server convert sang YYYY-MM-01.
// - Categories filter expense only (income không track budget).
// Submit qua Server Action, hiển thị lỗi qua useActionState + form shake animation.
import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthPicker } from '@/components/ui/date-picker';
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
import type { Budget, Category } from '@/types/database';
import { createBudget, updateBudget, type ActionState } from './actions';
import * as m from '@/paraglide/messages';

interface CategoryOption {
  id: string;
  name: string;
  icon_name: string;
  color: string;
}

interface BudgetFormProps {
  budget?: Budget;
  categories: CategoryOption[];
  defaultMonth: string; // YYYY-MM
  trigger?: 'create' | 'edit';
}

const initialState: ActionState = null;

const FIRST_CATEGORY = '__first__';

export function BudgetForm({
  budget,
  categories,
  defaultMonth,
  trigger = 'create',
}: BudgetFormProps) {
  const isEdit = !!budget;
  const action = isEdit ? updateBudget.bind(null, budget!.id) : createBudget;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [categoryId, setCategoryId] = useState<string>(budget?.category_id ?? categories[0]?.id ?? '');

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

  // Auto-close dialog + toast khi submit thành công
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(isEdit ? m.budgets_update_toast() : m.budgets_create_toast());
      });
    }
  }, [closeOnSuccess, isEdit]);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  const triggerButton = isEdit ? (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="size-3.5" /> {m.common_edit()}
    </Button>
  ) : (
    <Button className="gap-1.5">
      <Plus className="size-4" /> {m.budgets_create_btn_form()}
    </Button>
  );

  const categoryValue = categoryId || FIRST_CATEGORY;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerButton as React.ReactElement} />
      <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.budgets_form_edit_title() : m.budgets_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {m.budgets_form_category_label()}
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
              <Label htmlFor="category_id">{m.budgets_form_category_label()}</Label>
              <input type="hidden" name="category_id" value={categoryId} />
              <Select
                value={categoryValue}
                items={[{ value: FIRST_CATEGORY, label: m.budgets_no_categories() }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                onValueChange={(v) =>
                  v && setCategoryId(v === FIRST_CATEGORY ? '' : v)
                }
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue placeholder={m.budgets_form_category_label()} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      {m.budgets_no_categories()}
                    </SelectItem>
                  ) : (
                    categories.map((cat) => {
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

            <div className="space-y-2">
              <Label htmlFor="period_month">{m.budgets_form_month_label()}</Label>
              <MonthPicker
                id="period_month"
                name="period_month"
                defaultValue={budget?.period_month?.slice(0, 7) ?? defaultMonth}
                required
                aria-invalid={Boolean(fieldError('period_month'))}
              />
              {fieldError('period_month') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('period_month')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{m.budgets_form_amount_label()}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={budget?.amount ?? ''}
                placeholder="0"
                required
              />
              {fieldError('amount') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('amount')}
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
            <Button type="submit" disabled={pending || categories.length === 0}>
              {pending ? m.common_saving() : isEdit ? m.common_update() : m.common_create()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}