'use client';

// UserAvatar: header avatar + dropdown menu (email, secondary nav, logout).
// Phase 15.4: chuyển nav phụ (Danh mục, Định kỳ, Cài đặt) từ header chính
// vào đây để header gọn 1 dòng.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  Repeat,
  Settings as SettingsIcon,
  Tag,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutAction } from '@/features/auth/actions';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

interface UserAvatarProps {
  email: string;
}

// Lấy chữ cái đầu của email làm avatar (uppercase, fallback '?').
function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  return (local[0] ?? '?').toUpperCase();
}

const secondaryLinks = [
  { href: '/categories', label: () => m.nav_categories(), icon: Tag },
  { href: '/recurring', label: () => m.nav_recurring(), icon: Repeat },
  { href: '/settings', label: () => m.nav_settings(), icon: SettingsIcon },
] as const;

export function UserAvatar({ email }: UserAvatarProps) {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex items-center gap-1.5 border-2 border-border bg-card px-1 py-1 shadow-brutal-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-brutal outline-none"
        aria-label={m.user_avatar_menu_aria()}
      >
        <span className="inline-flex size-8 items-center justify-center border-2 border-border bg-secondary font-heading text-sm font-bold uppercase">
          {initials(email)}
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-mono text-xs font-medium normal-case tracking-normal">
            {email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {secondaryLinks.map((link) => {
            const Icon = link.icon;
            const localizedHref = buildLocalizedHref(link.href, getLocale());
            const active =
              pathname === localizedHref || pathname?.startsWith(localizedHref + '/');
            return (
              <DropdownMenuItem
                key={link.href}
                nativeButton={false}
                render={<Link href={localizedHref} className="w-full" />}
                className={active ? 'bg-secondary/40' : undefined}
              >
                <Icon className="size-4" /> {link.label()}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem
            nativeButton
            render={
              <button type="submit" className="w-full" aria-label={m.nav_signout()} />
            }
            variant="destructive"
          >
            <LogOut className="size-4" /> {m.nav_signout()}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
