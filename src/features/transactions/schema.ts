// Zod schemas cho transactions — dùng chung giữa Server Action và client form.
// Phase 25: factory pattern nhận `t` (translator) để error messages theo locale.
import { z } from 'zod';

export type TransactionMessages = {
  account_required: () => string;
  category_invalid: () => string;
  transaction_type_required: () => string;
  amount_required: () => string;
  amount_positive: () => string;
  date_required: () => string;
  date_invalid: () => string;
  note_max: () => string;
};

const transactionTypes = ['income', 'expense', 'transfer'] as const;

export const transactionSchema = (t: TransactionMessages) =>
  z.object({
    account_id: z
      .string()
      .uuid(t.account_required()),
    // category_id optional vì transfer không cần category
    category_id: z
      .string()
      .uuid(t.category_invalid())
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : undefined)),
    type: z.enum(transactionTypes, { message: t.transaction_type_required() }),
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

export type TransactionInput = z.infer<ReturnType<typeof transactionSchema>>;
