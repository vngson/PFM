// Zod schemas cho settings (profile + change password).
// Phase 25: factory pattern nhận `t` (translator).
import { z } from 'zod';

export type SettingsMessages = {
  username_min: () => string;
  username_max: () => string;
  username_charset: () => string;
  display_name_max: () => string;
  current_password_required: () => string;
  password_min: () => string;
  password_max: () => string;
  password_confirm_required: () => string;
  password_confirm_mismatch: () => string;
  password_same_as_current: () => string;
};

const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;

export const profileSchema = (t: SettingsMessages) =>
  z.object({
    username: z
      .string()
      .min(3, t.username_min())
      .max(32, t.username_max())
      .regex(USERNAME_RE, t.username_charset()),
    full_name: z
      .string()
      .max(80, t.display_name_max())
      .optional()
      .or(z.literal('')),
    currency_code: z.enum(['VND', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'SGD', 'THB']),
    locale: z.enum(['vi-VN', 'en-US']),
  });

export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;

export const passwordSchema = (t: SettingsMessages) =>
  z
    .object({
      current: z.string().min(1, t.current_password_required()),
      next: z
        .string()
        .min(8, t.password_min())
        .max(72, t.password_max()),
      confirm: z.string().min(1, t.password_confirm_required()),
    })
    .refine((d) => d.next === d.confirm, {
      path: ['confirm'],
      message: t.password_confirm_mismatch(),
    })
    .refine((d) => d.current !== d.next, {
      path: ['next'],
      message: t.password_same_as_current(),
    });

export type PasswordInput = z.infer<ReturnType<typeof passwordSchema>>;
