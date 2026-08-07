'use client';

// Restore form: client component gọi restoreAccount server action.
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { restoreAccount } from '@/features/auth/account-actions';
import * as m from '@/paraglide/messages';

export function RestoreAccountForm() {
  const [pending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      try {
        await restoreAccount();
      } catch (err) {
        // restoreAccount redirects on success; other errors thrown
        console.error('Restore failed:', err);
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleRestore}
      disabled={pending}
      size="lg"
      className="w-full"
    >
      {pending ? m.common_loading() : m.account_deleted_restore_button()}
    </Button>
  );
}