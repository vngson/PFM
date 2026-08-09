'use client';

// ExportDataCard: button cho user download toàn bộ data dưới dạng JSON.
// Hữu ích cho backup + portability.
import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { notify } from '@/lib/toast';
import { exportAllData } from './actions';
import * as m from '@/paraglide/messages';

export function ExportDataCard() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      try {
        const data = await exportAllData();
        if (!data) {
          setError(m.settings_export_error());
          return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const userIdShort = data.user.id.slice(0, 8);
        a.download = `pfm-export-${new Date().toISOString().slice(0, 10)}-${userIdShort}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        notify.success(m.settings_export_success());
      } catch (err) {
        const msg = err instanceof Error ? err.message : m.common_unknown_error();
        setError(msg);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {m.settings_export_body()}
      </p>
      <Button
        type="button"
        onClick={handleExport}
        disabled={pending}
        variant="outline"
        className="gap-2"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {pending ? m.settings_export_pending() : m.settings_export_btn()}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
