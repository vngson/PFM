'use server';

// Server Actions cho auth flow: signup, login, logout.
// Tất cả đều dùng server Supabase client để tận dụng cookies + RLS.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashIp } from '@/lib/auth/hash-ip';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import { signupSchema, loginSchema } from './schema';
import * as m from '@/paraglide/messages';

// Sync with content/privacy/vi.md + content/privacy/en.md frontmatter.
const CURRENT_POLICY_VERSION = '1.0';

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

/**
 * Signup: tạo user mới qua Supabase Auth (gửi email xác nhận),
 * sau đó tạo row trong profiles và seed default categories.
 *
 * Trả về null nếu thành công (đã redirect sang /check-email).
 */
export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema({
    username_min: m.zod_username_min,
    username_max: m.zod_username_max,
    username_charset: m.zod_username_charset,
    email_invalid: m.zod_email_invalid,
    password_min: m.zod_password_min,
    password_max: m.zod_password_max,
    password_required: m.zod_password_required,
    consent_required: m.zod_consent_required,
  }).safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    consent: formData.get('consent'),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { username, email, password } = parsed.data;
  const supabase = await createClient();

  // 1. Tạo auth user. emailRedirectTo trỏ về /auth/callback để exchange code.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3456'}/auth/callback`,
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 2. Tạo profile + seed categories. Dùng service role để bypass RLS
  //    (RLS sẽ chặn INSERT vào profiles ngay sau signup vì session cũ).
  //    Tuy nhiên ở đây user vừa signUp xong đã có session — vẫn có thể
  //    dùng anon client vì policy cho phép user_id = auth.uid().
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      currency_code: 'VND',
      locale: 'vi-VN',
    });

    if (profileError && !profileError.message.includes('duplicate key')) {
      return { error: m.auth_action_profile_failed({ message: profileError.message }) };
    }

    // Seed default categories qua RPC function (idempotent)
    const { error: seedError } = await supabase.rpc('seed_default_categories_for', {
      p_user_id: data.user.id,
    });

    if (seedError) {
      // Không block signup — categories có thể tạo sau
      console.error('Seed categories failed:', seedError.message);
    }

    // PDPD: ghi audit row cho lần đồng ý đầu tiên (terms_and_privacy).
    // Admin client cần thiết vì RLS không cho phép INSERT — chỉ service_role.
    try {
      const admin = createAdminClient();
      const hdrs = await headers();
      const ip = hashIp(hdrs.get('x-forwarded-for'));
      const userAgent = hdrs.get('user-agent')?.slice(0, 500) ?? null;
      const { error: consentError } = await admin.from('consent_records').insert({
        user_id: data.user.id,
        consent_type: 'terms_and_privacy',
        policy_version: CURRENT_POLICY_VERSION,
        ip_hash: ip,
        user_agent: userAgent,
      });
      if (consentError) {
        // Không block signup — user đã đồng ý qua checkbox; log để audit lại.
        console.error('Consent record insert failed:', consentError.message);
      }
    } catch (e) {
      // Service role key chưa cấu hình — bỏ qua, không block signup.
      console.error('Admin client unavailable for consent_records:', e);
    }
  }

  // 3. Redirect sang trang check-email
  redirect(buildLocalizedHref('/check-email', getLocale()));
}

/**
 * Login: đăng nhập bằng email + password.
 * Chỉ hoạt động nếu user đã xác nhận email.
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
    return { error: m.auth_action_invalid_credentials() };
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
