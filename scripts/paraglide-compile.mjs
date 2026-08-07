// Wrapper quanh @inlang/paraglide-js compile để truyền options mà CLI không expose.
//
// Phase 25 URL strategy: ['url', 'globalVariable', 'cookie', 'baseLocale'].
// - url: derive locale từ URL prefix (/vi/*, /en/*) qua paraglideMiddleware.
// - globalVariable: cho phép setLocale() từ [locale]/layout.tsx set _locale closure
//   → getLocale() đọc được locale trong cùng request scope (RSC render sau proxy).
// - cookie: hint cho client init; server fallback khi globalVariable chưa set.
// - baseLocale: fallback cuối cùng (vi).
//
// Lưu ý: AsyncLocalStorage set bởi paraglideMiddleware thoát khi resolve() return,
// nên RSC render sau đó phải dùng globalVariable hoặc cookie.

import { compile } from '@inlang/paraglide-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

await compile({
  project: resolve(projectRoot, './project.inlang'),
  outdir: resolve(projectRoot, './src/paraglide'),
  strategy: ['url', 'globalVariable', 'cookie', 'baseLocale'],
});
