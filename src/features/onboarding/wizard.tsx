'use client';

// OnboardingWizard: 3-step first-time user onboarding.
// Step 1: Welcome + intro.
// Step 2: Create first account.
// Step 3: Create first category (optional, can skip).
// Sau khi complete: lưu flag vào localStorage để không hiện lại.
//
// Phase 22: chỉ hiện khi user chưa có account + category (DB-derived).
// Phase 25: full i18n — toàn bộ UI text qua Paraglide messages.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PartyPopper, Wallet, Tag, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/toast';
import { buildLocalizedHref, getLocale } from '@/lib/i18n/locale-path';
import * as m from '@/paraglide/messages';

const STORAGE_KEY = 'pfm:onboarded';

interface AccountOption {
  id: string;
  name: string;
  currency_code: string;
  color: string | null;
  icon_name: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon_name: string;
  color: string;
}

interface OnboardingWizardProps {
  accounts: AccountOption[];
  categories: CategoryOption[];
}

type Step = 1 | 2 | 3 | 'done';

export function OnboardingWizard({ accounts, categories }: OnboardingWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Hiển thị wizard khi user chưa có account/category và chưa từng đóng.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (dismissed === '1') return;
    if (accounts.length === 0 && categories.length === 0) {
      setOpen(true);
    }
  }, [accounts.length, categories.length]);

  function dismiss() {
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
  }

  function next() {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) {
      // Nếu user vừa tạo account/category qua quick action → reload để fetch lại.
      if (accounts.length > 0 || categories.length > 0) {
        notify.success(m.onboarding_done_toast());
        setStep('done');
        dismiss();
        router.refresh();
      } else {
        // User skip hết → cũng dismiss.
        dismiss();
      }
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md border-2 border-border bg-card p-6 shadow-brutal-lg">
        {/* Close button */}
        <button
          type="button"
          aria-label={m.onboarding_close_aria()}
          onClick={dismiss}
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center border-2 border-border bg-background text-foreground transition-colors hover:bg-destructive hover:text-white"
        >
          <X className="size-4" />
        </button>

        {/* Step indicator */}
        <div className="mb-4 flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 ${
                typeof step === 'number' && step >= s ? 'bg-secondary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="inline-flex size-12 items-center justify-center border-2 border-border bg-secondary shadow-brutal-sm">
              <PartyPopper className="size-6" />
            </div>
            <h2
              id="onboarding-title"
              className="font-heading text-2xl font-bold uppercase"
            >
              {m.onboarding_step1_title()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {m.onboarding_step1_body()}
            </p>
            <Button onClick={next} className="w-full gap-2">
              {m.onboarding_step1_cta()} <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="inline-flex size-12 items-center justify-center border-2 border-border bg-secondary shadow-brutal-sm">
              <Wallet className="size-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold uppercase">
              {m.onboarding_step2_title()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {m.onboarding_step2_body()}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={next}
                className="flex-1"
              >
                {m.onboarding_step2_skip()}
              </Button>
              <Link
                href={buildLocalizedHref("/accounts", getLocale())}
                onClick={dismiss}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 border-2 border-border bg-primary px-4 font-heading text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-brutal-sm transition-all hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
              >
                {m.onboarding_step2_cta()} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="inline-flex size-12 items-center justify-center border-2 border-border bg-secondary shadow-brutal-sm">
              <Tag className="size-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold uppercase">
              {m.onboarding_step3_title()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {m.onboarding_step3_body()}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={next}
                className="flex-1"
              >
                {m.onboarding_step3_skip()}
              </Button>
              <Link
                href={buildLocalizedHref("/categories", getLocale())}
                onClick={dismiss}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 border-2 border-border bg-primary px-4 font-heading text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-brutal-sm transition-all hover:shadow-brutal hover:-translate-x-[2px] hover:-translate-y-[2px]"
              >
                {m.onboarding_step3_cta()} <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
