// Settings page: profile + password + sessions.

import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/features/settings/profile-form';
import { PasswordForm } from '@/features/settings/password-form';
import { SessionsCard } from '@/features/settings/sessions-card';
import { ExportDataCard } from '@/features/settings/export-data-card';
import { DeleteAccountCard } from '@/features/settings/delete-account-card';
import { listSessions } from '@/features/settings/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, KeyRound, MonitorSmartphone, Settings as SettingsIcon, Download, Trash2 } from 'lucide-react';
import type { ProfileInput } from '@/features/settings/schema';
import * as m from '@/paraglide/messages';

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, sessions] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, full_name, currency_code, locale')
      .eq('id', user!.id)
      .single(),
    listSessions(),
  ]);

  const defaults: ProfileInput = {
    username: profile?.username ?? '',
    full_name: profile?.full_name ?? '',
    currency_code: (profile?.currency_code as ProfileInput['currency_code']) ?? 'VND',
    locale: (profile?.locale as ProfileInput['locale']) ?? 'vi-VN',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex size-10 items-center justify-center border-2 border-border bg-card shadow-brutal-sm">
          <SettingsIcon className="size-5" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-tight">
            {m.settings_title()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {m.settings_subtitle()}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4" /> {m.settings_profile_title()}
          </CardTitle>
          <CardDescription>
            {m.settings_profile_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultValues={defaults} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" /> {m.settings_password_title()}
          </CardTitle>
          <CardDescription>
            {m.settings_password_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-4" /> {m.settings_sessions_title()}
          </CardTitle>
          <CardDescription>
            {m.settings_sessions_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsCard sessions={sessions} currentEmail={user!.email ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="size-4" /> {m.settings_export_title()}
          </CardTitle>
          <CardDescription>
            {m.settings_export_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportDataCard />
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="size-4" /> {m.settings_danger_title()}
          </CardTitle>
          <CardDescription>
            {m.settings_danger_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountCard email={user!.email ?? ''} />
        </CardContent>
      </Card>

      <Separator />

      <p className="text-center text-xs text-muted-foreground">
        PFM · v0.1 · {new Date().getFullYear()}
      </p>
    </div>
  );
}
