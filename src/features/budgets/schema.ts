// Zod schemas cho budgets — validate form + Server Action input.
// DB constraint: 1 budget / (user, category, period_month).
// period_month luôn là ngày 1 của tháng (vd: 2026-08-01).
// Factory pattern nhận `t` (translator).
import { z } from 'zod';

export type BudgetMessages = {
  category_required: () => string;
  amount_required: () => string;
  amount_positive: () => string;
  month_invalid: () => string;
};

export const budgetSchema = (t: BudgetMessages) =>
  z.object({
    category_id: z.string().uuid(t.category_required()),
    amount: z
      .string()
      .min(1, t.amount_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) > 0, {
        message: t.amount_positive(),
      })
      .transform((s) => Number(s)),
    /** Tháng áp dụng — UI gửi YYYY-MM, ta chuyển về YYYY-MM-01 khi insert. */
    period_month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, t.month_invalid())
      .transform((s) => `${s}-01`),
  });

export type BudgetInput = z.infer<ReturnType<typeof budgetSchema>>;
