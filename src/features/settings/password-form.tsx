'use client';

// PasswordForm: đổi mật khẩu (yêu cầu current + next + confirm).

import { useActionState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { changePassword, type SettingsActionState } from './actions';
import * as m from '@/paraglide/messages';

const initialState: SettingsActionState = null;

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

  const toggleLabel = (visible: boolean) =>
    visible ? m.common_hide_password() : m.common_show_password();

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="current">{m.settings_password_current_label()}</Label>
        <div className="relative">
          <Input
            id="current"
            name="current"
            type={show.current ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
            aria-label={toggleLabel(show.current)}
            className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {show.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {fieldError('current') ? (
          <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
            ⚠ {fieldError('current')}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="next">{m.settings_password_new_label()}</Label>
          <div className="relative">
            <Input
              id="next"
              name="next"
              type={show.next ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
              aria-label={toggleLabel(show.next)}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {show.next ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldError('next') ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {fieldError('next')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{m.settings_password_min_hint()}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">{m.settings_password_confirm_label()}</Label>
          <div className="relative">
            <Input
              id="confirm"
              name="confirm"
              type={show.confirm ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
              aria-label={toggleLabel(show.confirm)}
              className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {show.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldError('confirm') ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {fieldError('confirm')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="gap-1.5">
          <KeyRound className="size-4" />
          {pending ? m.common_saving() : m.settings_password_change_btn()}
        </Button>
      </div>
    </form>
  );
}
