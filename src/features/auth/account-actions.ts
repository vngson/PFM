'use server';

// Account deletion + restore actions (PDPD soft delete).
// requestAccountDeletion: set deleted_at + scheduled_purge_at, sign out.
// restoreAccount: clear deleted_at, redirect to dashboard.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

export type AccountActionState = {
  error?: string;
  success?: string;
} | null;

export async function requestAccountDeletion(): Promise<AccountActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: m.common_unauthorized() };
  }

  const purgeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString(), scheduled_purge_at: purgeAt })
    .eq('id', user.id);

  if (error) {
    console.error('[account:requestDeletion]', error.message);
    return { error: m.account_deleted_restore_failed() };
  }

  await supabase.auth.signOut();
  redirect(buildLocalizedHref('/login', getLocale()));
}

export async function restoreAccount(): Promise<AccountActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: m.common_unauthorized() };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: null, scheduled_purge_at: null })
    .eq('id', user.id);

  if (error) {
    return { error: m.account_deleted_restore_failed() };
  }

  redirect(buildLocalizedHref('/dashboard', getLocale()));
}