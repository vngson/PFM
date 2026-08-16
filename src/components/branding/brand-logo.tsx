import Link from 'next/link';
import Image from 'next/image';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  className?: string;
}

// Brand mark + chữ "PFM" — dùng ở nav header, auth pages, footer.
// Neo-brutalism: chữ đậm uppercase, mark có border đen + offset shadow.
// Default href qua buildLocalizedHref để theo locale hiện tại.
export function BrandLogo({ href, className }: BrandLogoProps) {
  // Re-eval mỗi render → đồng bộ với locale hiện tại (SSR + client URL strategy).
  const resolvedHref = href ?? buildLocalizedHref('/dashboard', getLocale());
  return (
    <Link
      href={resolvedHref}
      className={cn(
        'group inline-flex items-center gap-2.5 transition-transform hover:-rotate-1',
        className,
      )}
      aria-label="PFM"
    >
      <span className="relative inline-flex">
        <span className="absolute top-1 left-1 inline-flex size-8 items-center justify-center bg-foreground" aria-hidden="true" />
        <Image
          src="/logo-mark.svg"
          alt=""
          width={32}
          height={32}
          className="relative inline-block border-2 border-border bg-secondary"
          priority
        />
      </span>
      {/* Mobile <sm: chỉ "PFM" (gọn ~50px) để vừa 344px viewport.
          ≥sm: thêm "MONEY" subtitle bên cạnh — branding đầy đủ ở desktop. */}
      <span className="inline-flex items-baseline gap-0 font-heading text-lg font-bold uppercase tracking-wider leading-none">
        <span className="text-primary">PFM</span>
        <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">MONEY</span>
      </span>
    </Link>
  );
}
