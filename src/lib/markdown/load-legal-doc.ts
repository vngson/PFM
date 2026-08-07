// Server-only helper: read legal markdown files from /content directory.
// Used by /privacy + /terms pages to render localized PDPD-compliant docs.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type LegalDocType = 'privacy' | 'terms';
export type SupportedLocale = 'vi' | 'en';

export async function loadLegalDoc(
  type: LegalDocType,
  locale: SupportedLocale,
): Promise<string> {
  const file = `${type}/${locale}.md`;
  const fallback = `${type}/vi.md`;
  const root = process.cwd();
  try {
    return await readFile(path.join(root, 'content', file), 'utf-8');
  } catch {
    return await readFile(path.join(root, 'content', fallback), 'utf-8');
  }
}