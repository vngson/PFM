'use client';

// AccountForm: dialog tạo/sửa tài khoản.
// - Nếu truyền `account` → mode edit
// - Nếu không → mode create
// Submit qua Server Action, hiển thị lỗi qua useActionState.
// Neo-brutalism: color swatches vuông + icon grid sticker style.
import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

import { COLOR_CATALOG } from '@/features/categories/color-catalog';
import { ICON_CATALOG } from '@/features/categories/icon-catalog';
import { useDialogFormState } from '@/lib/hooks/use-dialog-form-state';
import { notify } from '@/lib/toast';
import type { Account } from '@/types/database';
import * as m from '@/paraglide/messages';
import { createAccount, updateAccount, type ActionState } from './actions';

const ACCOUNT_TYPE_LABELS: Record<Account['type'], () => string> = {
  cash: () => m.accounts_type_cash(),
  bank: () => m.accounts_type_bank(),
  credit_card: () => m.accounts_type_credit_card(),
  e_wallet: () => m.accounts_type_e_wallet(),
  savings: () => m.accounts_type_savings(),
  investment: () => m.accounts_type_investment(),
  other: () => m.accounts_type_other(),
};

const ACCOUNT_TYPE_ITEMS: { value: Account['type']; label: string }[] = (
  Object.entries(ACCOUNT_TYPE_LABELS) as [Account['type'], () => string][]
).map(([value, getLabel]) => ({ value, label: getLabel() }));

const initialState: ActionState = null;

interface AccountFormProps {
  account?: Account;
  trigger?: 'create' | 'edit';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function AccountForm({
  account,
  trigger = 'create',
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger = false,
}: AccountFormProps) {
  const isEdit = !!account;
  const action = isEdit
    ? updateAccount.bind(null, account!.id)
    : createAccount;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = (v: boolean) => {
    if (onOpenChangeProp) onOpenChangeProp(v);
    if (!isControlled) setOpenInternal(v);
  };
  const [type, setType] = useState<Account['type']>(account?.type ?? 'cash');
  const [color, setColor] = useState<string>(account?.color ?? '#3b82f6');
  const [iconName, setIconName] = useState<string>(account?.icon_name ?? '');

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  // Auto-close dialog + toast khi submit thành công
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(isEdit ? m.accounts_update_toast() : m.accounts_create_toast());
      });
    }
  }, [closeOnSuccess, isEdit]);

  const triggerButton = isEdit ? (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Pencil className="size-3.5" /> {m.common_edit()}
    </Button>
  ) : (
    <Button className="gap-1.5">
      <Plus className="size-4" /> {m.accounts_create_btn()}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : <DialogTrigger render={triggerButton as React.ReactElement} />}
      <DialogContent className="overflow-y-auto sm:max-h-[90vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? m.accounts_form_edit_title() : m.accounts_form_create_title()}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? m.accounts_form_edit_title()
              : m.accounts_page_subtitle()}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <div className="space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="name">{m.accounts_form_name_label()}</Label>
              <Input
                id="name"
                name="name"
                defaultValue={account?.name ?? ''}
                placeholder={m.accounts_form_name_placeholder()}
                required
              />
              {fieldError('name') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('name')}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">{m.accounts_form_type_label()}</Label>
                <Select
                  name="type"
                  items={ACCOUNT_TYPE_ITEMS}
                  value={type}
                  onValueChange={(v) => setType(v as Account['type'])}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPE_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency_code">{m.accounts_form_currency_label()}</Label>
                <Input
                  id="currency_code"
                  name="currency_code"
                  defaultValue={account?.currency_code ?? 'VND'}
                  maxLength={3}
                  required
                />
              </div>
            </div>

            {!isEdit ? (
              <div className="space-y-2">
                <Label htmlFor="initial_balance">{m.accounts_form_balance_label()}</Label>
                <Input
                  id="initial_balance"
                  name="initial_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  required
                />
                {fieldError('initial_balance') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('initial_balance')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Color picker — neo-brutalism: square swatches with hard border */}
            <div className="space-y-2">
              <Label>{m.accounts_form_color_label()}</Label>
              <input type="hidden" name="color" value={color} />
              <div className="flex flex-wrap gap-2">
                {COLOR_CATALOG.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label()}
                    aria-label={m.common_color_label({ label: c.label() })}
                    onClick={() => setColor(c.value)}
                    className={`size-8 border-2 border-border transition-all ${
                      color === c.value
                        ? 'shadow-brutal-sm -translate-x-[2px] -translate-y-[2px]'
                        : 'hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal-sm'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Icon picker — sticker style */}
            <div className="space-y-2">
              <Label>{m.accounts_form_icon_label()}</Label>
              <input type="hidden" name="icon_name" value={iconName} />
              <div className="grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto border-2 border-border p-2 sm:grid-cols-10">
                {ICON_CATALOG.map(({ name, Icon }) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => setIconName(iconName === name ? '' : name)}
                    className={`flex size-9 items-center justify-center border-2 transition-all ${
                      iconName === name
                        ? 'border-foreground bg-foreground text-background rotate-[-3deg] scale-110 shadow-brutal-sm'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
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
            <Button type="submit" disabled={pending}>
              {pending ? m.common_saving() : isEdit ? m.common_update() : m.common_create()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
