'use server';

// Server Actions cho auth flow: email + password + OTP verify signup, login, logout.
// Luồng signup:
//   1. requestOtpAction: gọi supabase.auth.signUp({ email, password })
//      → Supabase gửi OTP 8 ký tự về email (khi "Confirm email" bật ở Dashboard).
//   2. verifyOtpAction:  gọi supabase.auth.verifyOtp → tạo session cookies.
//      Sau đó completeUserSignup chạy idempotent: insert profile (default username
//      từ email localPart), RPC seed_default_categories_for, insert consent_records.
//
// Login giữ nguyên email + password (signInWithPassword).
// OTP chỉ cần verify email lần đầu; lần sau chỉ cần email + password.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashIp } from '@/lib/auth/hash-ip';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import { requestOtpSchema, verifyOtpSchema, loginSchema, requestPasswordResetSchema, verifyRecoveryOtpSchema, updatePasswordSchema } from './schema';
import { deriveDefaultUsername } from './derive-default-username';
import * as m from '@/paraglide/messages';

// Sync with content/privacy/vi.md + content/privacy/en.md frontmatter.
const CURRENT_POLICY_VERSION = '1.0';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

/**
 * Step 1 — đăng ký email + password, Supabase gửi OTP 8 ký tự để xác minh email
 * (khi "Confirm email" bật trong Dashboard). Trả về null nếu thành công
 * (đã redirect sang /verify-otp?email=...).
 *
 * Edge case: nếu project tắt "Confirm email" → signUp auto-confirm + tạo
 * session ngay → short-circuit thẳng về /dashboard (xử lý nhánh data.session
 * không null).
 */
export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = requestOtpSchema({
    email_invalid: m.zod_email_invalid,
    consent_required: m.zod_consent_required,
    password_min: m.zod_password_min,
    password_max: m.zod_password_max,
    password_required: m.zod_password_required,
  }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    consent: formData.get('consent'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const locale = getLocale();
  const { email, password } = parsed.data;

  // PHẢI dùng absolute URL cho emailRedirectTo — Supabase ghép nó với
  // Site URL trong Dashboard nếu chỉ truyền relative path. Lấy host từ
  // request hiện tại (qua headers()) thay vì hardcode để khớp port đang chạy
  // (3456 dev, production domain khác).
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3456';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;
  const callbackPath = `${buildLocalizedHref('/auth/callback', locale)}?next=${encodeURIComponent(buildLocalizedHref('/verify-otp', locale))}`;
  const emailRedirectTo = `${origin}${callbackPath}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { locale },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('already registered') ||
      msg.includes('user already') ||
      msg.includes('already been registered')
    ) {
      return { error: m.auth_err_email_taken() };
    }
    if (msg.includes('password') && (msg.includes('short') || msg.includes('characters'))) {
      return { error: m.zod_password_min() };
    }
    console.error('[signup]', error.message);
    return { error: m.auth_action_otp_failed() };
  }

  // Auto-confirm path: Dashboard tắt "Confirm email" → Supabase trả session
  // luôn. Chạy completeUserSignup rồi vào dashboard thẳng.
  if (data.session && data.user) {
    await completeUserSignup(supabase, data.user.id, data.user.email ?? email);
    revalidatePath('/', 'layout');
    redirect(buildLocalizedHref('/dashboard', locale));
  }

  // Default: email confirmation bật → Supabase gửi OTP 8 ký tự → user phải
  // verify qua /verify-otp để tạo session.
  redirect(
    buildLocalizedHref(`/verify-otp?email=${encodeURIComponent(email)}`, locale),
  );
}

/**
 * Step 2 — xác minh OTP 8 ký tự. verifyOtp tạo session cookies (qua setAll của
 * createServerClient). Sau đó completeUserSignup chạy idempotent.
 */
export async function verifyOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = verifyOtpSchema({
    email_invalid: m.zod_email_invalid,
    otp_invalid: m.zod_otp_invalid,
  }).safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: 'email',
  });

  if (error || !data.user) {
    return { error: m.auth_verify_otp_invalid_code() };
  }

  await completeUserSignup(
    supabase,
    data.user.id,
    data.user.email ?? parsed.data.email,
  );

  revalidatePath('/', 'layout');
  redirect(buildLocalizedHref('/dashboard', getLocale()));
}

/**
 * Tìm username chưa bị chiếm. Retry tối đa 3 lần với suffix UUID hex 6 chars,
 * fallback `user_<uuid8>` nếu vẫn fail.
 */
async function claimUniqueUsername(
  supabase: SupabaseClient,
  base: string,
): Promise<string> {
  const exists = async (u: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', u)
      .maybeSingle();
    return !!data;
  };
  if (!(await exists(base))) return base;
  for (let i = 0; i < 3; i++) {
    const suffix = crypto.randomUUID().slice(0, 6).replace(/-/g, '');
    const candidate = `${base.slice(0, 26)}_${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `user_${crypto.randomUUID().slice(0, 8).replace(/-/g, '')}`;
}

/**
 * Idempotent: insert profile (nếu chưa) + seed categories + insert consent.
 * Skip nếu user đã có profile row (re-login path).
 */
async function completeUserSignup(
  supabase: SupabaseClient,
  userId: string,
  email: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (existing) return;

  const baseUsername = deriveDefaultUsername(email);
  const username = await claimUniqueUsername(supabase, baseUsername);

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    username,
    currency_code: 'VND',
    locale: 'vi-VN',
  });
  if (profileError && !profileError.message.includes('duplicate key')) {
    throw new Error(profileError.message);
  }

  // Seed default categories qua RPC (idempotent — early-return nếu user đã có)
  const { error: seedError } = await supabase.rpc('seed_default_categories_for', {
    p_user_id: userId,
  });
  if (seedError) {
    console.error('Seed categories failed:', seedError.message);
  }

  // PDPD: ghi audit row. RLS không cho INSERT — dùng service_role.
  try {
    const admin = createAdminClient();
    const hdrs = await headers();
    const ip = hashIp(hdrs.get('x-forwarded-for'));
    const userAgent = hdrs.get('user-agent')?.slice(0, 500) ?? null;
    const { error: consentError } = await admin.from('consent_records').insert({
      user_id: userId,
      consent_type: 'terms_and_privacy',
      policy_version: CURRENT_POLICY_VERSION,
      ip_hash: ip,
      user_agent: userAgent,
    });
    if (consentError) {
      console.error('Consent record insert failed:', consentError.message);
    }
  } catch (e) {
    console.error('Admin client unavailable for consent_records:', e);
  }
}

/**
 * Login: đăng nhập bằng email + password.
 * Giữ nguyên — không đổi login flow.
 */
export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema({
    username_min: m.zod_username_min,
    username_max: m.zod_username_max,
    username_charset: m.zod_username_charset,
    email_invalid: m.zod_email_invalid,
    password_min: m.zod_password_min,
    password_max: m.zod_password_max,
    password_required: m.zod_password_required,
  }).safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Supabase trả message chứa "email not confirmed" cho user chưa verify.
    // Phân biệt với invalid credentials để UX rõ ràng.
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { error: m.auth_err_email_not_confirmed() };
    }
    console.error('[login]', error.message);
    return { error: m.auth_err_invalid_credentials() };
  }

  revalidatePath('/', 'layout');
  redirect(buildLocalizedHref('/dashboard', getLocale()));
}

/**
 * Logout: xóa session hiện tại, redirect về trang login.
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(buildLocalizedHref('/login', getLocale()));
}

/**
 * Forgot-password step 1 — gửi OTP 8 ký tự tới email để user verify recovery.
 * Dùng Supabase `resetPasswordForEmail`. Luôn trả success message dù email
 * có tồn tại hay không (tránh email enumeration).
 *
 * `redirectTo` là fallback cho magic-link template — nếu project chưa switch
 * sang OTP-only, Supabase sẽ gửi link tới URL này. Không dùng để navigate
 * trong app — user phải nhập OTP trên /forgot-password.
 */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { codeSent?: boolean; sentEmail?: string }> {
  const parsed = requestPasswordResetSchema({
    email_invalid: m.zod_email_invalid,
  }).safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { email } = parsed.data;

  // OTP-based recovery: Supabase gửi 8-char code qua email, user nhập vào
  // form B. Không truyền `redirectTo` vì flow không dùng magic link — không
  // cần whitelist URL trên Dashboard, hoạt động được với mọi domain/locale.
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    console.error('[forgot-password]', error.message);
    // Supabase rate limit (429) hoặc Dashboard config chưa bật Reset password
    // template đều trả error ở đây. Show message gốc để user check Dashboard
    // config (Authentication → Email Templates → Reset password).
    return { error: error.message };
  }

  return { codeSent: true, sentEmail: email };
}

/**
 * Forgot-password step 2 — verify OTP `type: 'recovery'`.
 * Tách riêng khỏi update password để sai OTP không lộ form đổi pass.
 * verifyOtp tạo session cookies với recovery scope; session này được
 * step 3 dùng để updateUser.
 */
export async function verifyRecoveryOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { otpVerified?: boolean; sentEmail?: string }> {
  const parsed = verifyRecoveryOtpSchema({
    email_invalid: m.zod_email_invalid,
    otp_invalid: m.zod_otp_invalid,
  }).safeParse({
    email: formData.get('email'),
    token: formData.get('token'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { email, token } = parsed.data;

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });

  if (error) {
    return { error: m.auth_verify_otp_invalid_code() };
  }

  return { otpVerified: true, sentEmail: email };
}

/**
 * Forgot-password step 3 — đổi password. Session hiện tại phải có recovery
 * scope (do verifyRecoveryOtpAction tạo ra) — nếu không updateUser fail.
 * Sau đó signOut để user login lại với pass mới.
 */
export async function updatePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema({
    password_min: m.zod_password_min,
    password_max: m.zod_password_max,
    passwords_mismatch: m.zod_passwords_mismatch,
  }).safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { password } = parsed.data;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('[update-password]', error.message);
    return { error: m.auth_action_otp_failed() };
  }

  // Đăng xuất session recovery để user login lại với pass mới.
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect(buildLocalizedHref('/login', getLocale()));
}
