'use client';

// DeleteAccountCard: danger zone — buộc nhập email để xác nhận trước khi soft delete.
// Phase 04 (PDPD): soft delete 30 ngày grace period. User login lại trong 30 ngày
// để khôi phục; sau đó cron job xóa vĩnh viễn.
import { useTransition, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { requestAccountDeletion } from '@/features/auth/account-actions';
import * as m from '@/paraglide/messages';

interface DeleteAccountCardProps {
  email: string;
}

export function DeleteAccountCard({ email }: DeleteAccountCardProps) {
  const [pending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await requestAccountDeletion();
        // requestAccountDeletion redirects to /login on success
      } catch (err) {
        const msg = err instanceof Error ? err.message : m.common_unknown_error();
        setError(msg);
      }
    });
  }

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTitle className="font-heading uppercase">
          {m.settings_delete_warning_title()}
        </AlertTitle>
        <AlertDescription>{m.settings_delete_warning_body()}</AlertDescription>
      </Alert>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirm">
            {m.settings_delete_confirm_label_prefix()}{' '}
            <span className="font-bold">{email}</span>{' '}
            {m.settings_delete_confirm_label_suffix()}
          </Label>
          <Input
            id="delete-confirm"
            name="email"
            type="email"
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={email}
            autoComplete="off"
            className="font-mono"
          />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          type="button"
          onClick={handleSubmit}
          variant="destructive"
          disabled={pending || confirmText !== email}
          className="gap-2"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          {pending ? m.common_deleting() : m.settings_delete_btn()}
        </Button>
      </div>
    </div>
  );
}