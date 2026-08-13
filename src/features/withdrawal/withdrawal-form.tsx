'use client';

// WithdrawalForm: dialog rút tiền mặt qua ATM.
//
// Submit tạo 3 hoặc 5 transactions tùy theo nguồn rút (= hay ≠ ngân hàng rút):
//
//   Same bank (nguồn = ngân hàng rút): 3 giao dịch
//     - trừ tiền rút từ ngân hàng
//     - trừ phí ATM từ ngân hàng
//     - cộng tiền mặt vào cash wallet
//
//   Cross bank (nguồn ≠ ngân hàng rút): 5 giao dịch
//     - trừ tiền từ nguồn (chuyển sang ngân hàng)
//     - cộng tiền vào ngân hàng
//     - trừ tiền rút từ ngân hàng
//     - trừ phí ATM từ ngân hàng
//     - cộng tiền mặt vào cash wallet
//
// UX:
// - User chọn nguồn (Momo/Agribank/...), ngân hàng rút (Agribank/VCB/...), category phí ATM.
// - Nếu nguồn = ngân hàng → 3 tx; nếu khác → 5 tx. Hint hiển thị số tx tương ứng.
// - Khi chọn category, ô phí auto-fill từ category.withdrawal_fee.
// - Date mặc định hôm nay, cho chỉnh qua DatePicker.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Pencil } from 'lucide-react';

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
import type { Account, Category } from '@/types/database';
import { createWithdrawal, type ActionState } from './actions';
import * as m from '@/paraglide/messages';

const FIRST_ACCOUNT = '__first__';
const FIRST_BANK = '__first__';
const FIRST_CATEGORY = '__first__';

const initialState: ActionState = null;

type AtmCategory = Pick<Category, 'id' | 'name' | 'icon_name' | 'color' | 'withdrawal_fee'>;

interface WithdrawalFormProps {
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'>[];
  atmCategories: AtmCategory[];
  /** Danh sách tài khoản ngân hàng/ví điện tử để chọn "ngân hàng rút tiền".
   *  Mặc định = danh sách `accounts` đã lọc cash wallet. */
  bankOptions: Pick<
    Account,
    'id' | 'name' | 'type' | 'currency_code' | 'color' | 'icon_name'
  >[];
  /** Trigger hiển thị nút (mặc định "create"). */
  trigger?: 'create';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const formatVnd = (n: number): string =>
  n.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export function WithdrawalForm({
  accounts,
  atmCategories,
  bankOptions,
  trigger = 'create',
}: WithdrawalFormProps) {
  const action = createWithdrawal;
  const { state, formAction, pending, closeOnSuccess } = useDialogFormState(
    action,
    initialState,
  );

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Bỏ cash wallet khỏi danh sách nguồn — cash wallet là destination, không cho rút từ cash.
  const sourceOptions = useMemo(
    () => accounts.filter((a) => a.type !== 'cash'),
    [accounts],
  );

  const [sourceId, setSourceId] = useState<string>(
    sourceOptions[0]?.id ?? '',
  );
  // Ngân hàng rút mặc định = nguồn (nếu nguồn là bank/e-wallet) hoặc bank đầu tiên.
  const initialBankId =
    sourceOptions[0]?.id && bankOptions.some((b) => b.id === sourceOptions[0].id)
      ? sourceOptions[0].id
      : bankOptions[0]?.id ?? '';
  const [bankId, setBankId] = useState<string>(initialBankId);
  const [categoryId, setCategoryId] = useState<string>(
    atmCategories[0]?.id ?? '',
  );
  const [amount, setAmount] = useState<string>('');
  const [fee, setFee] = useState<string>(
    atmCategories[0]?.withdrawal_fee != null
      ? String(atmCategories[0].withdrawal_fee)
      : '0',
  );
  const [occurredAt, setOccurredAt] = useState<string>(todayIso());

  // Same bank (3 tx) vs cross bank (5 tx)
  const isSameBank = sourceId !== '' && bankId !== '' && sourceId === bankId;
  const txCount = isSameBank ? 3 : 5;

  // Mở dialog: reset form về giá trị mặc định. Viết trong handler (event-driven)
  // thay vì useEffect để tránh "setState in effect" anti-pattern.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      const firstSrc = sourceOptions[0]?.id ?? '';
      setSourceId(firstSrc);
      setBankId(
        firstSrc && bankOptions.some((b) => b.id === firstSrc)
          ? firstSrc
          : bankOptions[0]?.id ?? '',
      );
      setCategoryId(atmCategories[0]?.id ?? '');
      setAmount('');
      setFee(
        atmCategories[0]?.withdrawal_fee != null
          ? String(atmCategories[0].withdrawal_fee)
          : '0',
      );
      setOccurredAt(todayIso());
    }
    setOpen(next);
  };

  // Khi user đổi nguồn → nếu nguồn có trong bankOptions, set bankId = sourceId (same bank mặc định).
  const handleSourceChange = (id: string) => {
    setSourceId(id);
    if (bankOptions.some((b) => b.id === id)) {
      setBankId(id);
    }
  };

  // Auto-close dialog khi submit thành công (useDialogFormState detect pending flip + null state).
  // Pattern giống account-form/transaction-form: setOpen(false) trong effect để match với lifecycle
  // của useActionState. KHÔNG dùng derived isOpen = open && !closeOnSuccess — setTimeout(0) reset
  // của hook sẽ ngay lập tức đảo closeOnSuccess về false, làm isOpen flip true → dialog bật lại.
  useEffect(() => {
    if (closeOnSuccess) {
      queueMicrotask(() => {
        setOpen(false);
        notify.success(m.withdrawal_create_toast());
      });
    }
  }, [closeOnSuccess]);

  // Khi user đổi category → fill fee theo withdrawal_fee (nếu có).
  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    const cat = atmCategories.find((c) => c.id === id);
    if (cat?.withdrawal_fee != null) {
      setFee(String(cat.withdrawal_fee));
    }
  };

  const amountNum = Number(amount) || 0;
  const feeNum = Number(fee) || 0;
  const total = amountNum + feeNum;

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
      {trigger === 'create' ? (
        <>
          <Banknote className="size-4" /> {m.withdrawal_create_btn()}
        </>
      ) : (
        <>
          <Pencil className="size-3.5" /> {m.common_edit()}
        </>
      )}
    </Button>
  );

  const noSources = sourceOptions.length === 0;
  const noBanks = bankOptions.length === 0;
  const noAtmCategories = atmCategories.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerButton as React.ReactElement} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.withdrawal_form_title()}</DialogTitle>
          <DialogDescription>{m.withdrawal_form_desc()}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction}>
          <div className="space-y-4">
            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="source_account_id">{m.withdrawal_source_label()}</Label>
              <input type="hidden" name="source_account_id" value={sourceId} />
              <Select
                value={sourceId || FIRST_ACCOUNT}
                items={[
                  { value: FIRST_ACCOUNT, label: m.withdrawal_source_placeholder() },
                  ...sourceOptions.map((a) => ({ value: a.id, label: a.name })),
                ]}
                onValueChange={(v) => v && v !== FIRST_ACCOUNT && handleSourceChange(v)}
              >
                <SelectTrigger id="source_account_id" className="w-full">
                  <SelectValue placeholder={m.withdrawal_source_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {noSources ? (
                    <SelectItem value="__empty__" disabled>
                      {m.withdrawal_source_placeholder()}
                    </SelectItem>
                  ) : (
                    sourceOptions.map((acc) => {
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
              {fieldError('source_account_id') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('source_account_id')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal_bank_account_id">
                {m.withdrawal_bank_label()}
              </Label>
              <input
                type="hidden"
                name="withdrawal_bank_account_id"
                value={bankId}
              />
              <Select
                value={bankId || FIRST_BANK}
                items={[
                  { value: FIRST_BANK, label: m.withdrawal_bank_placeholder() },
                  ...bankOptions.map((b) => ({ value: b.id, label: b.name })),
                ]}
                onValueChange={(v) => v && v !== FIRST_BANK && setBankId(v)}
              >
                <SelectTrigger
                  id="withdrawal_bank_account_id"
                  className="w-full"
                >
                  <SelectValue placeholder={m.withdrawal_bank_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {noBanks ? (
                    <SelectItem value="__empty_bank__" disabled>
                      {m.withdrawal_bank_placeholder()}
                    </SelectItem>
                  ) : (
                    bankOptions.map((bank) => {
                      const Icon = getIcon(bank.icon_name ?? '');
                      return (
                        <SelectItem key={bank.id} value={bank.id}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-flex size-4 shrink-0 items-center justify-center border border-border text-white"
                              style={{ backgroundColor: bank.color ?? '#64748b' }}
                            >
                              <Icon className="size-3" />
                            </span>
                            <span>{bank.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <p className="font-body text-xs text-muted-foreground">
                {m.withdrawal_bank_hint({ count: txCount })}
              </p>
              {fieldError('withdrawal_bank_account_id') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('withdrawal_bank_account_id')}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">{m.withdrawal_category_label()}</Label>
              <input type="hidden" name="category_id" value={categoryId} />
              <Select
                value={categoryId || FIRST_CATEGORY}
                items={[
                  { value: FIRST_CATEGORY, label: m.withdrawal_category_placeholder() },
                  ...atmCategories.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${formatVnd(c.withdrawal_fee ?? 0)}đ)`,
                  })),
                ]}
                onValueChange={(v) => v && v !== FIRST_CATEGORY && handleCategoryChange(v)}
              >
                <SelectTrigger id="category_id" className="w-full">
                  <SelectValue placeholder={m.withdrawal_category_placeholder()} />
                </SelectTrigger>
                <SelectContent>
                  {noAtmCategories ? (
                    <SelectItem value="__empty_cat__" disabled>
                      {m.withdrawal_no_atm_categories()}
                    </SelectItem>
                  ) : (
                    atmCategories.map((cat) => {
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
                            <span>
                              {cat.name} ({formatVnd(cat.withdrawal_fee ?? 0)}đ)
                            </span>
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
                <Label htmlFor="amount">{m.withdrawal_amount_label()}</Label>
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
                <Label htmlFor="fee">{m.withdrawal_fee_label()}</Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  step="100"
                  min="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="0"
                  required
                />
                <p className="font-body text-xs text-muted-foreground">
                  {m.withdrawal_fee_hint()}
                </p>
                {fieldError('fee') ? (
                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                    ⚠ {fieldError('fee')}
                  </p>
                ) : null}
              </div>
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
                placeholder={m.transactions_form_note_placeholder()}
                maxLength={200}
              />
              {fieldError('note') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError('note')}
                </p>
              ) : null}
            </div>

            {/* Tổng preview (read-only) */}
            <div className="border-2 border-border bg-secondary/30 p-3">
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {m.withdrawal_total_label()}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold">{formatVnd(total)}</span>
                <span className="font-body text-sm text-muted-foreground">
                  = {formatVnd(amountNum)} + {formatVnd(feeNum)} phí
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-[#f5d547]"></span>
                {m.withdrawal_cash_wallet_auto()}
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
            <Button
              type="submit"
              disabled={
                pending ||
                noSources ||
                noBanks ||
                noAtmCategories ||
                amountNum <= 0 ||
                !bankId
              }
            >
              {pending ? m.common_saving() : m.withdrawal_create_btn()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
