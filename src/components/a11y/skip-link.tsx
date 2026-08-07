// SkipLink: link ẩn để keyboard user skip thẳng vào main content.
// Phase 19: thêm vào root layout để cải thiện a11y.
// - Mặc định ẩn (sr-only), focus thì hiện ra ở góc trên-trái.
// - Bấm Enter → cuộn xuống #main.

import * as m from '@/paraglide/messages';

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-border focus:bg-secondary focus:px-4 focus:py-2 focus:font-heading focus:text-xs focus:font-bold focus:uppercase focus:tracking-wider focus:shadow-brutal-sm"
    >
      {m.skip_link_text()}
    </a>
  );
}