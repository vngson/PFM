'use client';

// Form login — dùng form action thuần với useActionState.
// Validation chạy hoàn toàn trong Server Action (loginAction).
// Không cần react-hook-form ở client: pattern chuẩn của React 19 + Next.js 16.
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

import { loginAction, type ActionState } from './actions';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const initialState: ActionState = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Helper lấy field error từ state.fieldErrors
  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  // Neo-brutalism micro-motion: shake form khi có error từ server
  useEffect(() => {
    if (state?.error && formRef.current) {
      formRef.current.classList.remove('animate-brutal-shake');
      // Re-trigger animation
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
        <CardTitle className="text-3xl">{m.auth_login_title()}</CardTitle>
        <CardDescription>{m.auth_login_subtitle()}</CardDescription>
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
            <Label htmlFor="password">{m.auth_password_label()}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!fieldError('password')}
              required
            />
            {fieldError('password') ? (
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
                ⚠ {fieldError('password')}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="mt-2 flex flex-col gap-3">
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? m.auth_login_pending() : m.auth_login_submit()}
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            {m.auth_login_no_account()}{' '}
            <Link
              href={buildLocalizedHref("/signup", getLocale())}
              className="font-bold text-foreground underline decoration-2 underline-offset-4 transition-colors hover:text-primary"
            >
              {m.auth_login_signup_link()}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
