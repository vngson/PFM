---
phase: 01
title: "Privacy & Terms Pages"
status: pending
priority: P1
dependencies: []
---

# Phase 01: Privacy & Terms Pages

## Overview
Tạo 2 trang markdown render nội dung Privacy Policy + Terms of Service cho cả VI + EN. Link từ footer protected layout. Block user mới (Phase 02) sẽ reference các trang này.

## Requirements
- **Functional**:
  - `/[locale]/privacy` — render `messages/privacy/{locale}.md`
  - `/[locale]/terms` — render `messages/terms/{locale}.md`
  - Locale `vi` → `vi.md`, `en` → `en.md` (default fallback `vi.md`)
  - Footer link trong protected layout tới cả 2 trang
- **Non-functional**:
  - Markdown render server-side (không cần client-side react-markdown)
  - Static page, không cache invalidation
  - Accessible: heading hierarchy + semantic HTML

## Architecture

```
src/app/[locale]/privacy/page.tsx  → server component, đọc file MD
src/app/[locale]/terms/page.tsx    → server component, đọc file MD
messages/privacy/vi.md             → nội dung tiếng Việt
messages/privacy/en.md             → nội dung tiếng Anh
messages/terms/vi.md
messages/terms/en.md
src/components/legal/markdown-renderer.tsx → safe MD → HTML (server-only)
src/lib/markdown/load-legal-doc.ts → read file system, return string
src/app/[locale]/(protected)/layout.tsx → thêm footer link
```

Markdown rendering: dùng `marked` (lightweight, server-safe, không cần DOMPurify nếu content do ta viết). Alternative: `react-markdown` + `remark-gfm` nếu cần GFM features.

## Related Code Files
- Create: `src/app/[locale]/privacy/page.tsx`
- Create: `src/app/[locale]/terms/page.tsx`
- Create: `content/privacy/vi.md`
- Create: `content/privacy/en.md`
- Create: `content/terms/vi.md`
- Create: `content/terms/en.md`
- Create: `src/components/legal/markdown-renderer.tsx`
- Create: `src/lib/markdown/load-legal-doc.ts`
- Modify: `src/app/[locale]/(protected)/layout.tsx` (thêm footer links)
- Modify: `package.json` (thêm `marked` + `@tailwindcss/typography`)
- Modify: `src/app/globals.css` (thêm `@plugin "@tailwindcss/typography"` — Tailwind v4 dùng CSS-first config, không có tailwind.config.ts)

## Implementation Steps

1. **Install dependencies**:
   ```bash
   pnpm add marked
   pnpm add -D @types/marked @tailwindcss/typography
   ```

   Update `src/app/globals.css` (Tailwind v4 dùng `@plugin` directive, không có config file):
   ```css
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "shadcn/tailwind.css";
   @plugin "@tailwindcss/typography";
   ```

2. **Tạo helper load legal doc**:
   ```ts
   // src/lib/markdown/load-legal-doc.ts
   import { readFile } from 'node:fs/promises';
   import path from 'node:path';

   export async function loadLegalDoc(
     type: 'privacy' | 'terms',
     locale: 'vi' | 'en',
   ): Promise<string> {
     const file = `${type}/${locale}.md`;
     const fallback = `${type}/vi.md`;
     try {
       return await readFile(
         path.join(process.cwd(), 'content', file),
         'utf-8',
       );
     } catch {
       return await readFile(
         path.join(process.cwd(), 'content', fallback),
         'utf-8',
       );
     }
   }
   ```

3. **Tạo markdown renderer**:
   ```tsx
   // src/components/legal/markdown-renderer.tsx
   import { marked } from 'marked';
   import { cn } from '@/lib/utils';

   interface Props { content: string; className?: string }

   export function MarkdownRenderer({ content, className }: Props) {
     const html = marked.parse(content, { async: false });
     return (
       <article
         className={cn('prose prose-stone max-w-none', className)}
         dangerouslySetInnerHTML={{ __html: html }}
       />
     );
   }
   ```

4. **Tạo 2 page files** (cùng pattern):
   ```tsx
   // src/app/[locale]/privacy/page.tsx
   import { notFound } from 'next/navigation';
   import { loadLegalDoc } from '@/lib/markdown/load-legal-doc';
   import { MarkdownRenderer } from '@/components/legal/markdown-renderer';
   import { isKnownLocale } from '@/lib/i18n/locale-path';

   export default async function PrivacyPage({
     params,
   }: { params: Promise<{ locale: string }> }) {
     const { locale: raw } = await params;
     if (!isKnownLocale(raw)) notFound();
     const locale = raw as 'vi' | 'en';
     const content = await loadLegalDoc('privacy', locale);
     return (
       <div className="mx-auto max-w-3xl space-y-6 p-6">
         <h1 className="font-heading text-3xl font-bold uppercase">
           Chính sách bảo mật
         </h1>
         <MarkdownRenderer content={content} />
       </div>
     );
   }
   ```

5. **Viết nội dung markdown** — 4 files, mỗi file ~150-300 dòng. Sections:
   - Privacy: mục đích thu thập, loại data (DLTQ), thời gian lưu trữ, quyền user, thông tin admin, cơ chế khiếu nại, thay đổi policy
   - Terms: chấp nhận điều khoản, mô tả dịch vụ, giới hạn trách nhiệm, chấm dứt tài khoản, luật áp dụng VN, giải quyết tranh chấp

6. **Thêm footer link** trong protected layout (đã có `Footer` component chưa?). Cần đọc file layout hiện tại để biết pattern. Tạm thời:
   ```tsx
   <footer className="border-t-2 border-border py-4 text-center text-xs">
     <Link href="/privacy">Chính sách bảo mật</Link>
     {' · '}
     <Link href="/terms">Điều khoản sử dụng</Link>
   </footer>
   ```

## Tests (TDD)

### Test 1: loadLegalDoc fallback
```ts
// src/lib/markdown/load-legal-doc.test.ts
import { describe, it, expect } from 'vitest';
import { loadLegalDoc } from './load-legal-doc';

describe('loadLegalDoc', () => {
  it('returns vi.md for locale=vi', async () => {
    const content = await loadLegalDoc('privacy', 'vi');
    expect(content).toContain('Chính sách');
  });

  it('returns en.md for locale=en', async () => {
    const content = await loadLegalDoc('privacy', 'en');
    expect(content.toLowerCase()).toContain('privacy');
  });

  it('falls back to vi.md for unknown locale', async () => {
    const content = await loadLegalDoc('privacy', 'fr' as 'vi' | 'en');
    expect(content).toContain('Chính sách');
  });
});
```

### Test 2: Markdown rendering
```ts
// src/components/legal/markdown-renderer.test.tsx
import { render } from '@testing-library/react';
import { MarkdownRenderer } from './markdown-renderer';

describe('MarkdownRenderer', () => {
  it('renders headings correctly', () => {
    const { container } = render(<MarkdownRenderer content="# Hello" />);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
  });

  it('renders paragraphs', () => {
    const { container } = render(<MarkdownRenderer content="Text here" />);
    expect(container.querySelector('p')?.textContent).toBe('Text here');
  });
});
```

### Test 3: route access
Manual test trong browser:
- `/vi/privacy` → render tiếng Việt
- `/en/privacy` → render tiếng Anh
- `/vi/terms` → render
- `/en/terms` → render

## Success Criteria
- [ ] `pnpm vitest run` → tests pass
- [ ] `pnpm build` → build OK
- [ ] 4 routes (`/vi/privacy`, `/vi/terms`, `/en/privacy`, `/en/terms`) render đúng locale
- [ ] Footer protected layout có link tới 2 trang
- [ ] Markdown có heading hierarchy đúng (h1 → h2 → h3)
- [ ] Nội dung cover đủ các mục PDPD yêu cầu (mục đích, loại data, quyền user)

## Risk Assessment
- **Risk**: Nội dung markdown có thể chứa HTML injection nếu user edit file
  - **Mitigation**: `marked` mặc định escape HTML; content do dev viết, không từ user
- **Risk**: Build-time vs runtime loading — Next.js 16 có thể bundle markdown như asset
  - **Mitigation**: Dùng `node:fs/promises` ở server component, chỉ chạy lúc build/request
- **Risk**: Vietnamese legal terminology chưa chuẩn
  - **Mitigation**: User review trước khi merge (đã chốt: tôi viết draft, user finalize)