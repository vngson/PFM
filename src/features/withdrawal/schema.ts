// Zod schema cho withdrawal form.
//
// Một lần rút có thể tạo 3 hoặc 5 transactions tùy theo `withdrawal_bank_account_id`:
//
//   Same bank (nguồn = ngân hàng rút) → 3 giao dịch:
//     - trừ tiền rút từ source, category "Rút tiền ATM"
//     - trừ phí ATM từ source, category "Phí ATM ..."
//     - cộng tiền mặt vào cash wallet
//
//   Cross bank (nguồn ≠ ngân hàng rút) → 5 giao dịch:
//     - trừ tiền từ nguồn, category "Chuyển tiền" (chuyển sang ngân hàng rút)
//     - cộng tiền vào ngân hàng rút, category "Nhận tiền ATM"
//     - trừ tiền rút từ ngân hàng rút, category "Rút tiền ATM"
//     - trừ phí ATM từ ngân hàng rút, category "Phí ATM ..."
//     - cộng tiền mặt vào cash wallet
//
// Factory pattern nhận `t` (translator) để error messages theo locale.
import { z } from 'zod';

export type WithdrawalMessages = {
  source_account_required: () => string;
  withdrawal_bank_required: () => string;
  category_required: () => string;
  amount_required: () => string;
  amount_positive: () => string;
  fee_required: () => string;
  fee_nonneg: () => string;
  date_required: () => string;
  date_invalid: () => string;
  note_max: () => string;
};

export const withdrawalSchema = (t: WithdrawalMessages) =>
  z.object({
    source_account_id: z.string().uuid(t.source_account_required()),
    withdrawal_bank_account_id: z.string().uuid(t.withdrawal_bank_required()),
    category_id: z.string().uuid(t.category_required()),
    amount: z
      .string()
      .min(1, t.amount_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) > 0, {
        message: t.amount_positive(),
      })
      .transform((s) => Number(s)),
    fee: z
      .string()
      .min(1, t.fee_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) >= 0, {
        message: t.fee_nonneg(),
      })
      .transform((s) => Number(s)),
    occurred_at: z
      .string()
      .min(1, t.date_required())
      .refine((s) => !isNaN(Date.parse(s)), {
        message: t.date_invalid(),
      })
      .transform((s) => s.split('T')[0] ?? s),
    note: z
      .string()
      .max(200, t.note_max())
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : undefined)),
  });

export type WithdrawalInput = z.infer<ReturnType<typeof withdrawalSchema>>;
