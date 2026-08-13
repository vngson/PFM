'use client';

// Step 2 form — nhập OTP 8 ký tự Supabase gửi về email.
// Submit → verifyOtpAction → nếu đúng thì server tạo session + completeUserSignup
// → redirect /dashboard. Nếu sai → form hiển thị auth_verify_otp_invalid_code.
//
// Resend button gọi lại requestOtpAction với cùng email.
import { useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { verifyOtpAction, requestOtpAction, type ActionState } from './actions';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const initialState: ActionState = null;

interface VerifyOtpFormProps {
  email: string;
}

export function VerifyOtpForm({ email }: VerifyOtpFormProps) {
  const [state, formAction, pending] = useActionState(verifyOtpAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  // Neo-brutalism: shake form khi có error
  useEffect(() => {
    if (state?.error && formRef.current) {
      formRef.current.classList.remove('animate-brutal-shake');
      void formRef.current.offsetWidth;
      formRef.current.classList.add('animate-brutal-shake');
      tokenRef.current?.select();
    }
  }, [state?.error]);

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 inline-flex border-2 border-border bg-secondary px-3 py-1 shadow-brutal-sm">
          <span className="font-heading text-xs font-bold uppercase tracking-wider">
            MONEY 📊
          </span>
        </div>
        <CardTitle className="text-3xl">{m.auth_verify_otp_title()}</CardTitle>
        <CardDescription>
          {m.auth_verify_otp_subtitle({ email })}
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction} noValidate>
        <CardContent className="space-y-4">
          <input type="hidden" name="email" value={email} />

          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="token">{m.auth_verify_otp_token_label()}</Label>
            <Input
              ref={tokenRef}
              id="token"
              name="token"
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              maxLength={8}
              pattern="[a-zA-Z0-9]{8}"
              placeholder={m.auth_verify_otp_token_placeholder()}
              aria-invalid={!!fieldError('token')}
              className="text-center text-2xl font-heading tracking-[0.4em] uppercase"
              required
            />
            {fieldError('token') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError('token')}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="mt-2 flex flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? m.auth_verify_otp_pending() : m.auth_verify_otp_submit()}
          </Button>
        </CardFooter>
      </form>

      {/* Resend là form độc lập — đặt ngoài form verify OTP để tránh nested <form>
          (browser hydration error). Vẫn nằm trong CardFooter visually nhờ wrapper div. */}
      <CardFooter className="mt-2 flex flex-col gap-3 border-t pt-4">
        <ResendButton email={email} />

        <p className="text-sm font-medium text-muted-foreground">
          <Link
            href={buildLocalizedHref('/login', getLocale())}
            className="font-bold text-foreground underline decoration-2 underline-offset-4 transition-colors hover:text-primary"
          >
            ← {m.auth_check_email_back().replace('← ', '')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

/** Button "Resend code" — bọc form riêng gọi requestOtpAction.
 *  Phải là top-level <form>, không được nest vào form khác. */
function ResendButton({ email }: { email: string }) {
  const [, formAction, pending] = useActionState(requestOtpAction, initialState);
  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="consent" value="on" />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="w-full"
      >
        {m.auth_verify_otp_resend()}
      </Button>
    </form>
  );
}
