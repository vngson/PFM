'use client';

// SessionsCard: hiển thị session hiện tại + nút đăng xuất các thiết bị khác.

import { useTransition } from 'react';
import { MonitorSmartphone, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNumberLocale } from '@/lib/format';

import { signOutOtherSessions, type SessionInfo } from './actions';
import * as m from '@/paraglide/messages';

interface SessionsCardProps {
  sessions: SessionInfo[];
  currentEmail: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(getNumberLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionsCard({ sessions, currentEmail }: SessionsCardProps) {
  const [pending, startTransition] = useTransition();

  const handleSignOutOthers = () => {
    startTransition(async () => {
      await signOutOtherSessions();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {m.settings_sessions_intro({ email: currentEmail })}
      </p>

      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 border-2 border-border bg-card p-3 shadow-brutal-sm"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex size-9 items-center justify-center border-2 border-border bg-muted">
                <MonitorSmartphone className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-heading text-xs font-bold uppercase tracking-wide">
                    {s.user_agent ?? m.settings_sessions_current_device()}
                  </p>
                  {s.is_current ? (
                    <Badge variant="income">{m.settings_sessions_current_badge()}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.settings_sessions_signed_in_at({ date: formatDate(s.last_sign_in_at) })}
                  {s.ip ? ` · IP: ${s.ip}` : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleSignOutOthers}
          disabled={pending}
          className="gap-1.5"
        >
          <LogOut className="size-4" />
          {pending ? m.settings_sessions_signing_out() : m.settings_sessions_signout_others()}
        </Button>
      </div>
    </div>
  );
}
