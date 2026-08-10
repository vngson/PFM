// Zod schema cho transfer form — 1 lần chuyển tạo 2 transactions
// (expense từ source + income vào destination). Cùng pattern với withdrawal.
//
// Khác withdrawal:
//   - Không có fee (chuyển đúng amount)
//   - Không có category (chuyển tiền nội bộ — không có phân loại)
//   - Destination là user chọn, không auto-create cash wallet
//   - Validate same-account và cash-to-cash ở server (xem actions.ts)
import { z } from 'zod';

export type TransferMessages = {
  from_account_required: () => string;
  to_account_required: () => string;
  amount_required: () => string;
  amount_positive: () => string;
  date_required: () => string;
  date_invalid: () => string;
  note_max: () => string;
};

export const transferSchema = (t: TransferMessages) =>
  z.object({
    from_account_id: z.string().uuid(t.from_account_required()),
    to_account_id: z.string().uuid(t.to_account_required()),
    amount: z
      .string()
      .min(1, t.amount_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) > 0, {
        message: t.amount_positive(),
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

export type TransferInput = z.infer<ReturnType<typeof transferSchema>>;
