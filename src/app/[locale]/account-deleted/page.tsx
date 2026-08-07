// /[locale]/account-deleted — read-only page cho user đang soft-deleted.
// Hiển thị countdown + button "Khôi phục" (clear deleted_at → redirect dashboard).
import { createClient } from '@/lib/supabase/server';
import { computeDaysRemaining } from '@/lib/account-deleted/countdown';
import { RestoreAccountForm } from './restore-form';
import * as m from '@/paraglide/messages';

export default async function AccountDeletedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('scheduled_purge_at')
    .eq('id', user.id)
    .single();

  const days = computeDaysRemaining(profile?.scheduled_purge_at ?? null);

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="font-heading text-2xl font-bold uppercase">
        {m.account_deleted_title()}
      </h1>
      <p className="text-sm text-muted-foreground">
        {m.account_deleted_description({ days })}
      </p>
      <RestoreAccountForm />
    </div>
  );
}