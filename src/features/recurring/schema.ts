// Zod schemas cho recurring_transactions — validate form + Server Action input.
// Phase 25: factory pattern nhận `t` (translator).
import { z } from 'zod';

export type RecurringMessages = {
  account_required: () => string;
  category_invalid: () => string;
  transaction_type_required: () => string;
  amount_required: () => string;
  amount_positive: () => string;
  frequency_required: () => string;
  start_required: () => string;
  date_invalid: () => string;
  end_invalid: () => string;
  note_max: () => string;
};

const frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
const types = ['income', 'expense'] as const; // recurring không support transfer (DB constraint)

export const recurringSchema = (t: RecurringMessages) =>
  z.object({
    account_id: z.string().uuid(t.account_required()),
    category_id: z
      .string()
      .uuid(t.category_invalid())
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : undefined)),
    type: z.enum(types, { message: t.transaction_type_required() }),
    amount: z
      .string()
      .min(1, t.amount_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) > 0, {
        message: t.amount_positive(),
      })
      .transform((s) => Number(s)),
    frequency: z.enum(frequencies, { message: t.frequency_required() }),
    start_date: z
      .string()
      .min(1, t.start_required())
      .refine((s) => !isNaN(Date.parse(s)), {
        message: t.date_invalid(),
      })
      .transform((s) => s.split('T')[0] ?? s),
    end_date: z
      .string()
      .refine((s) => !s || !isNaN(Date.parse(s)), {
        message: t.end_invalid(),
      })
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v.split('T')[0] : undefined)),
    note: z
      .string()
      .max(200, t.note_max())
      .optional()
      .or(z.literal(''))
      .transform((v) => (v ? v : undefined)),
  });

export type RecurringInput = z.infer<ReturnType<typeof recurringSchema>>;
