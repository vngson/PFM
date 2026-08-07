// /[locale]/privacy — render localized Privacy Policy markdown.
// Server Component; markdown do dev viết và committed trong repo, không phải
// user input, nên render thẳng qua marked.parse không cần DOMPurify.
import { notFound } from 'next/navigation';
import { isKnownLocale } from '@/lib/i18n/locale-path';
import { loadLegalDoc, type SupportedLocale } from '@/lib/markdown/load-legal-doc';
import { MarkdownRenderer } from '@/components/legal/markdown-renderer';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isKnownLocale(raw)) notFound();
  const locale = raw as SupportedLocale;
  const content = await loadLegalDoc('privacy', locale);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <MarkdownRenderer content={content} />
    </div>
  );
}