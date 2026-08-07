'use client';

import { LogOut } from 'lucide-react';
import * as m from '@/paraglide/messages';
import { logoutAction } from './actions';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label={m.logout_btn_aria()}
      >
        <LogOut className="size-4" />
        {m.logout_btn_label()}
      </button>
    </form>
  );
}
