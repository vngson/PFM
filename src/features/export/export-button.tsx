'use client';

// ExportButton: button gọi server action → nhận CSV content → trigger download.

import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import * as m from '@/paraglide/messages';

interface ExportButtonProps {
  /** Server action trả về { filename, content }. */
  action: () => Promise<{ filename: string; content: string }>;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon-sm';
}

export function ExportButton({
  action,
  label,
  variant = 'outline',
  size = 'default',
}: ExportButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default label resolve per-render (Paraglide needs runtime locale).
  const displayLabel = label ?? m.export_btn_label();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { filename, content } = await action();
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : m.export_error_toast());
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={pending}
      className="gap-1.5"
      aria-label={displayLabel}
      title={error ?? undefined}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {pending ? m.export_btn_pending() : displayLabel}
    </Button>
  );
}
