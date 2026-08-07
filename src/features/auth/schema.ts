// Zod schemas cho form auth — dùng chung giữa Server Action và client form.
// Phase 25: factory pattern nhận `t` (translator).
import { z } from 'zod';

export type AuthMessages = {
  username_min: () => string;
  username_max: () => string;
  username_charset: () => string;
  email_invalid: () => string;
  password_min: () => string;
  password_max: () => string;
  password_required: () => string;
  consent_required?: () => string;
};

export type SignupAuthMessages = AuthMessages & {
  consent_required: () => string;
};

export const signupSchema = (t: SignupAuthMessages) =>
  z.object({
    username: z
      .string()
      .min(3, t.username_min())
      .max(32, t.username_max())
      .regex(/^[a-z0-9_.]+$/i, t.username_charset()),
    email: z.string().email(t.email_invalid()),
    password: z
      .string()
      .min(8, t.password_min())
      .max(72, t.password_max()),
    consent: z.literal('on', { message: t.consent_required() }),
  });

export const loginSchema = (t: AuthMessages) =>
  z.object({
    email: z.string().email(t.email_invalid()),
    password: z.string().min(1, t.password_required()),
  });

export type SignupInput = z.infer<ReturnType<typeof signupSchema>>;
export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
