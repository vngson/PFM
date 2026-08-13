'use client';

// Forgot-password flow 3-step (OTP-based, consistent với signup flow):
//   Step 1 — nhập email → submit → Supabase gửi OTP 8 ký tự.
//   Step 2 — nhập OTP → verifyRecoveryOtpAction verify. Sai OTP báo lỗi,
//            không cho qua step 3.
//   Step 3 — nhập new password + confirm → updatePasswordAction đổi pass,
//            signOut, redirect /login.
//
// State machine: 'email' | 'otp' | 'password'. Mỗi state là 1 form riêng,
// hidden email truyền qua các step qua input hidden.

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  requestPasswordResetAction,
  verifyRecoveryOtpAction,
  updatePasswordAction,
} from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import * as m from '@/paraglide/messages';

type Step = 'email' | 'otp' | 'password';

type RequestState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  codeSent?: boolean;
  sentEmail?: string;
} | null;

type OtpState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  otpVerified?: boolean;
  sentEmail?: string;
} | null;

type PasswordState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') ?? '';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);

  const [requestState, requestFormAction, requestPending] = useActionState(
    requestPasswordResetAction,
    null as RequestState,
  );

  const [otpState, otpFormAction, otpPending] = useActionState(
    verifyRecoveryOtpAction,
    null as OtpState,
  );

  const [passwordState, passwordFormAction, passwordPending] = useActionState(
    updatePasswordAction,
    null as PasswordState,
  );

  // Step 1 → Step 2 transition: khi request trả về codeSent.
  useEffect(() => {
    if (requestState?.codeSent && requestState.sentEmail) {
      setEmail(requestState.sentEmail);
      setStep('otp');
    }
  }, [requestState]);

  // Step 2 → Step 3 transition: khi OTP verify thành công.
  useEffect(() => {
    if (otpState?.otpVerified) {
      setStep('password');
    }
  }, [otpState]);

  // --- Step 1: nhập email ---
  if (step === 'email') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{m.auth_forgot_title()}</CardTitle>
          <CardDescription>{m.auth_forgot_subtitle()}</CardDescription>
        </CardHeader>
        <form action={requestFormAction}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!fieldError(requestState, 'email')}
                required
              />
              {fieldError(requestState, 'email') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError(requestState, 'email')}
                </p>
              ) : null}
            </div>
            {requestState?.error ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {requestState.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={requestPending}>
              {requestPending ? m.auth_forgot_submit_pending() : m.auth_forgot_submit()}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // --- Step 2: nhập OTP ---
  if (step === 'otp') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{m.auth_forgot_title()}</CardTitle>
          <CardDescription>{m.auth_forgot_otp_hint()}</CardDescription>
        </CardHeader>
        <form action={otpFormAction}>
          <input type="hidden" name="email" value={email} />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">{m.auth_forgot_otp_label()}</Label>
              <Input
                id="token"
                name="token"
                type="text"
                inputMode="text"
                maxLength={8}
                pattern="[a-zA-Z0-9]{8}"
                autoComplete="one-time-code"
                placeholder={m.auth_forgot_otp_placeholder()}
                aria-invalid={!!fieldError(otpState, 'token')}
                className="uppercase tracking-widest"
                required
                autoFocus
              />
              {fieldError(otpState, 'token') ? (
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                  ⚠ {fieldError(otpState, 'token')}
                </p>
              ) : null}
            </div>
            {otpState?.error ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {otpState.error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={otpPending}>
              {otpPending ? m.auth_forgot_otp_submit_pending() : m.auth_forgot_otp_submit()}
            </Button>
          </CardFooter>
        </form>
      </Card>
    );
  }

  // --- Step 3: nhập new password + confirm ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.auth_forgot_title()}</CardTitle>
        <CardDescription>{m.auth_forgot_password_hint()}</CardDescription>
      </CardHeader>
      <form action={passwordFormAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{m.auth_forgot_new_password_label()}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!fieldError(passwordState, 'password')}
              required
              autoFocus
            />
            {fieldError(passwordState, 'password') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError(passwordState, 'password')}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {m.auth_forgot_confirm_password_label()}
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!fieldError(passwordState, 'confirmPassword')}
              required
            />
            {fieldError(passwordState, 'confirmPassword') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError(passwordState, 'confirmPassword')}
              </p>
            ) : null}
          </div>
          {passwordState?.error ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {passwordState.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending ? m.auth_forgot_done_pending() : m.auth_forgot_done()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function fieldError(
  state: { fieldErrors?: Record<string, string[]> } | null,
  field: string,
): string | undefined {
  return state?.fieldErrors?.[field]?.[0];
}
