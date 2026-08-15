'use client';

// Scroll-to-top FAB.
// - Hiển thị khi scrollY > 0 (ẩn ở đầu trang, hiện khi user đã scroll xuống).
// - Vị trí: `bottom-20 right-6` — đặt phía trên Quick-Add FAB
//   (`bottom-6 right-6`, size="lg" trong quick-add-form.tsx), cách ~16-20px.
// - Dùng `requestAnimationFrame` throttle để tránh setState mỗi scroll event
//   (rất tốn vì scroll fire ~60+/s). Passive listener để không block scroll.
// - `window.scrollTo({ top: 0, behavior: 'smooth' })` cho cảm giác tự nhiên.
// - `prefers-reduced-motion`: skip animation — cuộn instant cho user yêu cầu.

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import * as m from '@/paraglide/messages';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      // Coalesce multiple scroll events thành 1 setState / frame.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 0);
      });
    };
    // Set trạng thái ban đầu (vd user reload giữa chừng trang đã scroll).
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollUp = () => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  return (
    <Button
      size="icon"
      onClick={scrollUp}
      aria-label={m.scroll_to_top_aria()}
      // Inline-flex để có transition opacity + scale mượt khi toggle visible.
      // pointer-events-none khi ẩn để click xuyên qua (kể cả khi opacity-0).
      className={[
        'fixed right-4 z-40 shadow-brutal-lg transition-all duration-200 sm:right-6',
        // Mobile: MobileNav ở bottom-0 (cao ~64px) → ScrollToTop đặt bottom-28
        // (112px) cách MobileNav ~48px rõ ràng, không đè icon nav.
        // Desktop: Quick-Add FAB ở bottom-6 (cao ~56px) → bottom-24 (96px)
        // cách thêm ~40px, có buffer cho shadow-brutal-lg 8px.
        'bottom-28 sm:bottom-24',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      ].join(' ')}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
