'use client';

// ThemeToggle: 3-state cycle (light → dark → system).
// Phase 18: dùng useTheme từ next-themes để đọc/ghi theme + persist localStorage.
// Icon: Sun cho light, Moon cho dark, Monitor cho system.

import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import * as m from '@/paraglide/messages';

type Theme = 'light' | 'dark' | 'system';

function labelFor(t: Theme): string {
  return t === 'light'
    ? m.theme_label_light()
    : t === 'dark'
      ? m.theme_label_dark()
      : m.theme_label_system();
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Tránh hydration mismatch khi render trên server
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={m.theme_toggle_aria()}
        disabled
      >
        <Sun className="size-4" />
      </Button>
    );
  }

  const current = (theme ?? 'system') as Theme;
  const order: Theme[] = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(current) + 1) % order.length] ?? 'system';

  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;
  const currentLabel = labelFor(current);
  const nextLabel = labelFor(next);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={m.theme_toggle_switch_hint({ current: currentLabel, next: nextLabel })}
      title={m.theme_toggle_state({ current: currentLabel })}
    >
      <Icon className="size-4" />
    </Button>
  );
}