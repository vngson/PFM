// Zod schemas cho form auth — dùng chung giữa Server Action và client form.
// Factory pattern nhận `t` (translator).
import { z } from 'zod';

export type AuthMessages = {
  username_min: () => string;
  username_max: () => string;
  username_charset: () => string;
  email_invalid: () => string;
  password_min: () => string;
  password_max: () => string;
  password_required: () => string;
  passwords_mismatch?: () => string;
  consent_required?: () => string;
  otp_invalid?: () => string;
};

/** Subset cho step 1 — request OTP: email + password + consent. */
type RequestOtpMessages = Pick<
  AuthMessages,
  | 'email_invalid'
  | 'consent_required'
  | 'password_min'
  | 'password_max'
  | 'password_required'
>;

/** Subset cho step 2 — verify OTP: email + 8-char code. */
type VerifyOtpMessages = Pick<AuthMessages, 'email_invalid' | 'otp_invalid'>;

// Username rule: lowercase a-z, 0-9, _, . — length 3-32 (case-sensitive).
// Anchored trong regex để match DB CHECK constraint 0001:21-23 (regex `^[a-z0-9_.]{3,32}$`).
// Settings schema (`src/features/settings/schema.ts`) cùng pattern này.
export const USERNAME_RE = /^[a-z0-9_.]{3,32}$/;

/** Step 1 — request OTP: email + password + consent.
 *  Password length 8-72 (Supabase hard cap 72). */
export const requestOtpSchema = (t: RequestOtpMessages) =>
  z.object({
    email: z.string().min(1, t.email_invalid()).email(t.email_invalid()),
    password: z
      .string()
      .min(8, t.password_min?.() ?? t.email_invalid())
      .max(72, t.password_max?.() ?? t.email_invalid()),
    consent: z.literal('on', { message: t.consent_required?.() ?? '' }),
  });

/** Step 2 — verify OTP: email + 8-char code.
 *  Supabase gửi 8-char alphanumeric hex (a-z0-9) khi "Confirm email" bật
 *  với {{ .Token }} trong template. Accept cả lowercase lẫn uppercase. */
export const verifyOtpSchema = (t: VerifyOtpMessages) =>
  z.object({
    email: z.string().email(t.email_invalid()),
    token: z.string().regex(/^[a-zA-Z0-9]{8}$/, t.otp_invalid?.() ?? t.email_invalid()),
  });

export const loginSchema = (t: AuthMessages) =>
  z.object({
    email: z.string().email(t.email_invalid()),
    password: z.string().min(1, t.password_required()),
  });

/** Forgot-password step 1: chỉ cần email để gửi OTP recovery. */
export const requestPasswordResetSchema = (t: Pick<AuthMessages, 'email_invalid'>) =>
  z.object({
    email: z.string().email(t.email_invalid()),
  });

/** Forgot-password step 2: verify OTP `type: 'recovery'` — sai OTP không
 *  cho qua bước 3. `email` hidden từ form A cần thiết cho verifyOtp. */
export const verifyRecoveryOtpSchema = (
  t: Pick<AuthMessages, 'email_invalid' | 'otp_invalid'>,
) =>
  z.object({
    email: z.string().email(t.email_invalid()),
    token: z.string().regex(/^[a-zA-Z0-9]{8}$/, t.otp_invalid?.() ?? t.email_invalid()),
  });

/** Forgot-password step 3: new password + confirm password.
 *  Verify OTP đã chạy ở step 2 → session có recovery scope. */
export const updatePasswordSchema = (
  t: Pick<
    AuthMessages,
    'password_min' | 'password_max' | 'passwords_mismatch'
  >,
) =>
  z
      .object({
        password: z
          .string()
          .min(8, t.password_min())
          .max(72, t.password_max()),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        message: t.passwords_mismatch?.() ?? '',
        path: ['confirmPassword'],
      });

export type RequestOtpInput = z.infer<ReturnType<typeof requestOtpSchema>>;
export type VerifyOtpInput = z.infer<ReturnType<typeof verifyOtpSchema>>;
export type LoginInput = z.infer<ReturnType<typeof loginSchema>>;
export type RequestPasswordResetInput = z.infer<
  ReturnType<typeof requestPasswordResetSchema>
>;
export type VerifyRecoveryOtpInput = z.infer<
  ReturnType<typeof verifyRecoveryOtpSchema>
>;
export type UpdatePasswordInput = z.infer<
  ReturnType<typeof updatePasswordSchema>
>;
