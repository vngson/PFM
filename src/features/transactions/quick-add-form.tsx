'use client';

// QuickAddForm: mini dialog cho phép ghi nhanh 1 giao dịch chi tiêu.
// - Mặc định type = expense (case phổ biến nhất). Có nút toggle sang income.
// - Field tối thiểu: amount + category + account. Date = hôm nay. Note = optional.
// - Sau khi save thành công: đóng dialog + reset form.
// Phase 16: tối ưu cho user ghi nhanh mà không cần mở full form.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getIcon } from '@/features/categories/icon-catalog';
import { cn } from '@/lib/utils';
import { useDialogFormState } from '@/lib/hooks/use-dialog-form-state';
import { notify } from '@/lib/toast';
import type { Transaction } from '@/types/database';
import { createTransaction, type ActionState } from './actions';
import * as m from '@/paraglide/messages';

const FIRST_ACCOUNT = '__first__';
const FIRST_CATEGORY = '__first__';

const initialState: ActionState = null;

interface AccountOption {
  id: string;
  name: string;
  currency_code: string;
  color: string | null;
  icon_name: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon_name: string;
  color: string;
}

interface QuickAddFormProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function QuickAddForm({ accounts, categories }: QuickAddFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Transaction['type']>('expense');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string>('');
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    createTransaction,
    initialState,
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  // Reset form khi mở dialog — dùng queueMicrotask để tránh
  // react-hooks/set-state-in-effect (setState đồng bộ trong effect body).
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setType('expense');
        setAccountId(accounts[0]?.id ?? '');
        setCategoryId(filteredCategories[0]?.id ?? '');
      });
    }
  }, [open, accounts, filteredCategories]);

  // Đóng + toast khi save thành công (state về null + không có error)
  useEffect(() => {
    if (!state) return;
    if (state.error) {
      notify.error(state.error);
    } else if (state.fieldErrors) {
      const firstErr = Object.values(state.fieldErrors).flat()[0];
      if (firstErr) notify.error(firstErr);
    }
  }, [state]);

  // Auto-close dialog khi submit thành công — wrap setState trong
  // queueMicrotask để khỏi vi phạm react-hooks/set-state-in-effect.
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(
          type === 'income' ? m.quick_add_success_income() : m.quick_add_success_expense(),
        );
      });
    }
  }, [closeOnSuccess, type]);

  // Phase 21: mở dialog khi nhận event 'pfm:open-quick-add' (từ MobileNav FAB).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('pfm:open-quick-add', handler);
    return () => window.removeEventListener('pfm:open-quick-add', handler);
  }, []);

  const fieldErr = (k: string) => state?.fieldErrors?.[k]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 z-40 hidden gap-2 shadow-brutal-lg md:inline-flex"
        aria-label={m.quick_add_aria()}
      >
        <Zap className="size-5" /> {m.quick_add_btn()}
      </Button>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{m.quick_add_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.quick_add_dialog_desc()}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {/* Hidden type */}
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="occurred_at" value={todayIso()} />

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 border-2 border-border font-heading text-xs font-bold uppercase tracking-wider transition-all',
                type === 'expense'
                  ? 'bg-expense text-white shadow-brutal-sm'
                  : 'bg-background text-foreground hover:bg-expense/20',
              )}
              aria-pressed={type === 'expense'}
            >
              <Minus className="size-4" /> {m.quick_add_type_expense()}
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 border-2 border-border font-heading text-xs font-bold uppercase tracking-wider transition-all',
                type === 'income'
                  ? 'bg-income text-white shadow-brutal-sm'
                  : 'bg-background text-foreground hover:bg-income/20',
              )}
              aria-pressed={type === 'income'}
            >
              <Plus className="size-4" /> {m.quick_add_type_income()}
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-amount">{m.quick_add_amount_label()}</Label>
            <Input
              id="qa-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min={0}
              step={1000}
              placeholder="0"
              required
              autoFocus
              className="font-heading text-lg font-bold"
            />
            {fieldErr('amount') ? (
              <p className="text-xs text-destructive">{fieldErr('amount')}</p>
            ) : null}
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-account">{m.quick_add_account_label()}</Label>
            <input
              type="hidden"
              name="account_id"
              value={accountId === '' ? FIRST_ACCOUNT : accountId}
            />
            <Select
              value={accountId}
              items={accounts.map((a) => ({ value: a.id, label: a.name }))}
              onValueChange={(v) => setAccountId(v === FIRST_ACCOUNT ? '' : (v ?? ''))}
            >
              <SelectTrigger id="qa-account" className="w-full">
                <SelectValue placeholder={m.quick_add_account_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {accounts.length === 0 ? (
                  <SelectItem value={FIRST_ACCOUNT} disabled>
                    {m.quick_add_no_accounts()}
                  </SelectItem>
                ) : (
                  accounts.map((acc) => {
                    const Icon = getIcon(acc.icon_name ?? '');
                    return (
                      <SelectItem key={acc.id} value={acc.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex size-4 shrink-0 items-center justify-center border border-border text-white"
                            style={{ backgroundColor: acc.color ?? '#64748b' }}
                          >
                            <Icon className="size-2.5" />
                          </span>
                          {acc.name}
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {fieldErr('account_id') ? (
              <p className="text-xs text-destructive">{fieldErr('account_id')}</p>
            ) : null}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-category">{m.quick_add_category_label()}</Label>
            <input
              type="hidden"
              name="category_id"
              value={categoryId === '' ? FIRST_CATEGORY : categoryId}
            />
            <Select
              value={categoryId}
              items={[{ value: FIRST_CATEGORY, label: type === 'income' ? m.quick_add_no_categories_income() : m.quick_add_no_categories_expense() }, ...filteredCategories.map((c) => ({ value: c.id, label: c.name }))]}
              onValueChange={(v) => setCategoryId(v === FIRST_CATEGORY ? '' : (v ?? ''))}
            >
              <SelectTrigger id="qa-category" className="w-full">
                <SelectValue placeholder={m.quick_add_category_placeholder()} />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <SelectItem value={FIRST_CATEGORY} disabled>
                    {type === 'income' ? m.quick_add_no_categories_income() : m.quick_add_no_categories_expense()}
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
                            <Icon className="size-2.5" />
                          </span>
                          {cat.name}
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {fieldErr('category_id') ? (
              <p className="text-xs text-destructive">{fieldErr('category_id')}</p>
            ) : null}
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="qa-note">
              {m.quick_add_note_label()} <span className="text-xs font-normal text-muted-foreground">{m.quick_add_note_optional()}</span>
            </Label>
            <Input
              id="qa-note"
              name="note"
              type="text"
              placeholder={m.quick_add_note_placeholder()}
              maxLength={500}
            />
          </div>

          {state?.error && !state.fieldErrors ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {m.quick_add_cancel()}
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-1.5"
              disabled={pending || accounts.length === 0}
            >
              <Zap className="size-4" />
              {pending ? m.common_saving() : m.quick_add_submit()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
