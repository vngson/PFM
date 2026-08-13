'use client';

// Form signup — dùng form action thuần với useActionState.
// Step 1 của OTP flow: thu email + password + consent. Submit gọi requestOtpAction
// → Supabase gửi mã 8 ký tự về email → redirect /verify-otp?email=...
//
// Step 2 form nằm ở features/auth/verify-otp-form.tsx.
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

import { requestOtpAction, type ActionState } from './actions';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const initialState: ActionState = null;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(requestOtpAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  // Neo-brutalism: shake form khi có error
  useEffect(() => {
    if (state?.error && formRef.current) {
      formRef.current.classList.remove('animate-brutal-shake');
      void formRef.current.offsetWidth;
      formRef.current.classList.add('animate-brutal-shake');
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
        <CardTitle className="text-3xl">{m.auth_signup_title()}</CardTitle>
        <CardDescription>{m.auth_signup_subtitle()}</CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction} noValidate>
        <CardContent className="space-y-4">
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!fieldError('email')}
              required
            />
            {fieldError('email') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError('email')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{m.auth_signup_password_label()}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={m.auth_signup_password_placeholder()}
              aria-invalid={!!fieldError('password')}
              required
            />
            {fieldError('password') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError('password')}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {m.auth_signup_password_hint()}
            </p>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              value="on"
              required
              aria-required="true"
              aria-invalid={!!fieldError('consent')}
              className="mt-1 size-4 shrink-0 border-2 border-border accent-primary"
            />
            <label
              htmlFor="consent"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              {m.auth_consent_prefix()}{' '}
              <Link
                href={buildLocalizedHref('/privacy', getLocale())}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:text-primary"
              >
                {m.auth_consent_privacy()}
              </Link>
              {' '}{m.auth_consent_and()}{' '}
              <Link
                href={buildLocalizedHref('/terms', getLocale())}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:text-primary"
              >
                {m.auth_consent_terms()}
              </Link>
            </label>
          </div>
          {fieldError('consent') ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {fieldError('consent')}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="mt-2 flex flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? m.auth_signup_pending() : m.auth_signup_submit()}
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            {m.auth_signup_have_account()}{' '}
            <Link
              href={buildLocalizedHref('/login', getLocale())}
              className="font-bold text-foreground underline decoration-2 underline-offset-4 transition-colors hover:text-primary"
            >
              {m.auth_signup_login_link()}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
