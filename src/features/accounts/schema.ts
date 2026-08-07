// Zod schemas cho accounts — dùng chung giữa Server Action và client form.
// Phase 25: factory pattern nhận `t` (translator) để error messages theo locale.
import { z } from 'zod';

export type AccountMessages = {
  account_name_required: () => string;
  account_name_max: () => string;
  account_type_required: () => string;
  currency_min: () => string;
  currency_max: () => string;
  initial_balance_required: () => string;
  initial_balance_nonneg: () => string;
  color_hex: () => string;
};

const accountTypes = [
  'cash',
  'bank',
  'credit_card',
  'e_wallet',
  'savings',
  'investment',
  'other',
] as const;

export const accountSchema = (t: AccountMessages) =>
  z.object({
    name: z
      .string()
      .min(1, t.account_name_required())
      .max(60, t.account_name_max()),
    type: z.enum(accountTypes, { message: t.account_type_required() }),
    currency_code: z
      .string()
      .min(3, t.currency_min())
      .max(3, t.currency_max())
      .default('VND')
      .transform((s) => s.toUpperCase()),
    initial_balance: z
      .string()
      .min(1, t.initial_balance_required())
      .refine((s) => !isNaN(Number(s)) && Number(s) >= 0, {
        message: t.initial_balance_nonneg(),
      })
      .transform((s) => Number(s)),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, t.color_hex())
      .default('#3b82f6'),
    icon_name: z.string().optional().default(''),
  });

export type AccountInput = z.infer<ReturnType<typeof accountSchema>>;
