// Layout cho các trang auth (login, signup, check-email, error).
// Neo-brutalism: bold dotted bg pattern + form card giữa màn hình.
// LanguageSwitcher nằm cố định top-right để user đổi ngôn ngữ từ bất kỳ
// trang auth nào (login / signup / verify-otp / check-email / error).
import { LanguageSwitcher } from '@/components/i18n/language-switcher';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center p-4 sm:p-6">
      {/* Decorative sticker accents */}
      <div className="pointer-events-none absolute top-10 left-6 size-20 border-4 border-border bg-secondary shadow-brutal rotate-[-8deg] sm:size-24" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 right-6 size-16 border-4 border-border bg-accent shadow-brutal rotate-[6deg] sm:size-20" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/3 right-12 hidden size-12 border-4 border-border bg-success shadow-brutal-sm rotate-[12deg] sm:block" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1/3 left-12 hidden size-14 border-4 border-border bg-warning shadow-brutal-sm rotate-[-12deg] sm:block" aria-hidden="true" />

      {/* Locale switcher — fixed top-right, nằm trên layer decorative */}
      <div className="absolute top-3 right-3 z-20 sm:top-4 sm:right-4">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
