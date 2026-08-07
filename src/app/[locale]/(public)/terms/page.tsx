// /[locale]/terms — render localized Terms of Service markdown.
import { notFound } from 'next/navigation';
import { isKnownLocale } from '@/lib/i18n/locale-path';
import { loadLegalDoc, type SupportedLocale } from '@/lib/markdown/load-legal-doc';
import { MarkdownRenderer } from '@/components/legal/markdown-renderer';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isKnownLocale(raw)) notFound();
  const locale = raw as SupportedLocale;
  const content = await loadLegalDoc('terms', locale);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <MarkdownRenderer content={content} />
    </div>
  );
}