// Zod schemas cho categories — dùng chung giữa Server Action và client form.
// Factory pattern nhận `t` (translator) để error messages theo locale.
import { z } from 'zod';

export type CategoryMessages = {
  category_name_required: () => string;
  category_name_max: () => string;
  category_type_required: () => string;
  icon_required: () => string;
  icon_max: () => string;
  color_hex: () => string;
  sort_order_nonneg: () => string;
};

export const categorySchema = (t: CategoryMessages) =>
  z.object({
    name: z
      .string()
      .min(1, t.category_name_required())
      .max(40, t.category_name_max()),
    type: z.enum(['income', 'expense'], { message: t.category_type_required() }),
    icon_name: z
      .string()
      .min(1, t.icon_required())
      .max(50, t.icon_max()),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, t.color_hex()),
    sort_order: z
      .string()
      .optional()
      .transform((s) => (s ? Number(s) : 0))
      .refine((n) => Number.isInteger(n) && n >= 0, {
        message: t.sort_order_nonneg(),
      }),
  });

export type CategoryInput = z.infer<ReturnType<typeof categorySchema>>;
