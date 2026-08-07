// Server-side markdown renderer using `marked`.
// marked mặc định escape HTML — content do dev viết, không từ user input,
// nên an toàn dùng dangerouslySetInnerHTML. Nếu sau này render user content,
// phải sanitize trước (e.g. isomorphic-dompurify).
import { marked } from 'marked';
import { cn } from '@/lib/utils';

type Props = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className }: Props) {
  const html = marked.parse(content, { async: false }) as string;
  return (
    <article
      className={cn('prose prose-stone max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}