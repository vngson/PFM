// Page wrapper cho /[locale]/forgot-password — OTP-based password recovery flow.
// Không yêu cầu query param (state machine ở client).
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
