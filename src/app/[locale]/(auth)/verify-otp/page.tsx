// Page wrapper cho /[locale]/verify-otp — step 2 của signup OTP flow.
// Server Component: đọc ?email= searchParam, redirect về /signup nếu thiếu.
import { redirect } from 'next/navigation';
import { VerifyOtpForm } from '@/features/auth/verify-otp-form';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';

export default async function VerifyOtpPage(props: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await props.searchParams;
  if (!email) {
    redirect(buildLocalizedHref('/signup', getLocale()));
  }
  return <VerifyOtpForm email={email} />;
}
