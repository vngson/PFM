'use client';

// ProfileForm: chỉnh sửa username, full_name, currency_code, locale.
// Submit qua Server Action, dùng useActionState để hiển thị lỗi/thành công.

import { useActionState } from 'react';
import { Save, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { updateProfile, type SettingsActionState } from './actions';
import type { ProfileInput } from './schema';
import * as m from '@/paraglide/messages';

const initialState: SettingsActionState = null;

interface ProfileFormProps {
  defaultValues: ProfileInput;
}

const CURRENCIES = [
  { value: 'VND', label: () => m.settings_currency_vnd() },
  { value: 'USD', label: () => m.settings_currency_usd() },
  { value: 'EUR', label: () => m.settings_currency_eur() },
  { value: 'JPY', label: () => m.settings_currency_jpy() },
  { value: 'GBP', label: () => m.settings_currency_gbp() },
  { value: 'AUD', label: () => m.settings_currency_aud() },
  { value: 'SGD', label: () => m.settings_currency_sgd() },
  { value: 'THB', label: () => m.settings_currency_thb() },
] as const;

const LOCALES = [
  { value: 'vi-VN', label: () => m.settings_locale_vi() },
  { value: 'en-US', label: () => m.settings_locale_en() },
] as const;

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  const fieldError = (key: string): string | undefined =>
    state?.fieldErrors?.[key]?.[0];

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">{m.settings_username_label()}</Label>
          <Input
            id="username"
            name="username"
            defaultValue={defaultValues.username}
            placeholder={m.settings_username_placeholder()}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-z0-9_.]{3,32}"
          />
          {fieldError('username') ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {fieldError('username')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {m.settings_username_hint()}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">{m.settings_display_name_label()}</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={defaultValues.full_name ?? ''}
            placeholder={m.settings_display_name_placeholder()}
            maxLength={80}
          />
          {fieldError('full_name') ? (
            <p className="font-heading text-xs font-bold uppercase tracking-wide text-destructive">
              ⚠ {fieldError('full_name')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency_code">{m.settings_currency_label()}</Label>
          <Select name="currency_code" defaultValue={defaultValues.currency_code}>
            <SelectTrigger id="currency_code" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locale">{m.settings_locale_label()}</Label>
          <Select name="locale" defaultValue={defaultValues.locale}>
            <SelectTrigger id="locale" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Save className="size-4" />
          {pending ? m.common_saving() : m.settings_save_btn()}
        </Button>
      </div>

      {/* hint icon cho accessibility */}
      <span className="sr-only">
        <User className="size-4" />
      </span>
    </form>
  );
}
