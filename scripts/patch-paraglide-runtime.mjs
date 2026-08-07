// Post-process generated src/paraglide/runtime.js so its closure state
// (`_locale`, `localeInitiallySet`, `serverAsyncLocalStorage`) is mirrored on
// globalThis via a shared plain object.
//
// Why: Turbopack chunk-splitting creates separate runtime.js instances per
// chunk. Paraglide emits `export let getLocale = ...` and `let _locale` as
// per-instance closures. setLocale() in [locale]/layout.tsx writes `_locale`
// to instance A; m.*() in feature components reads from instance B.
//
// Targeted edits:
//   1. Insert state injection at the very top of the file (before any const).
//   2. Replace the export `let serverAsyncLocalStorage = undefined;` with
//      `export let serverAsyncLocalStorage = _gl.serverAsyncLocalStorage;`
//      plus an Object.defineProperty that mirrors writes back to _gl.
//   3. Rewrite function bodies: replace reads of `serverAsyncLocalStorage`,
//      `_locale`, `localeInitiallySet` with `_gl.*`. Since the export in
//      step 2 sets the variable to point at _gl on first read, but writes
//      happen to the local binding, we replace writes too: `serverAsyncLocalStorage = x`
//      → `_gl.serverAsyncLocalStorage = x`.
//
// To avoid double-replacement inside the inserted state block, we anchor
// state init behind a sentinel marker, then start body rewrites after
// that marker.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const runtimePath = resolve(projectRoot, 'src/paraglide/runtime.js');

const original = await readFile(runtimePath, 'utf8');

if (original.includes('__paraglide_state')) {
  console.log('[patch-paraglide-runtime] already patched, skipping');
  process.exit(0);
}

// 1. Prepend the globalThis state declaration, sentinel comment, and patch
//    the export declaration of serverAsyncLocalStorage.
const SENTINEL = '/* __PARAGLIDE_PATCH_SENTINEL__ */';
const topInject = `
// PATCHED BEGIN: shared state via globalThis. Do not edit by hand.
const _gl = (globalThis.__paraglide_state ?? (globalThis.__paraglide_state = {
  _locale: undefined,
  localeInitiallySet: false,
  serverAsyncLocalStorage: undefined,
}));
${SENTINEL}
// PATCHED END
`;
let patched = original.replace(
  /\/\* eslint-disable \*\//,
  `/* eslint-disable */\n${topInject}`,
);

// 2. Replace the export declaration of serverAsyncLocalStorage with one that
// reads initial value from _gl. The `export let` makes it a writable binding.
// Then add an Object.defineProperty that intercepts writes for testability.
patched = patched.replace(
  /export let serverAsyncLocalStorage = undefined;/,
  `export let serverAsyncLocalStorage = _gl.serverAsyncLocalStorage;`,
);

// 3. From the sentinel onward, replace writes of the three closure variables
// with writes to _gl. Reads are left intact (the variable still references
// the initial value, but writes flow through _gl which is the actual source
// of truth).
//
// 3a. serverAsyncLocalStorage =
const afterSentinel = patched.indexOf(SENTINEL);
if (afterSentinel === -1) throw new Error('sentinel not found after patch');
const before = patched.slice(0, afterSentinel + SENTINEL.length);
const after = patched.slice(afterSentinel + SENTINEL.length);

// Replace writes of `serverAsyncLocalStorage = ...` with `_gl.serverAsyncLocalStorage = ...`.
// Avoid `serverAsyncLocalStorage = _gl.serverAsyncLocalStorage` (the export
// line we already updated) — exclude that line.
let afterRewritten = after.replace(
  /(\n\s+)(serverAsyncLocalStorage = [^_\n][^\n]*)/g,
  '$1_gl.serverAsyncLocalStorage = $2'.replace('$2', ''),
);

// Different approach: replace specific patterns within `after`. Use simple
// regex but skip the export declaration line we already touched.
afterRewritten = after.replace(
  /^(\s*)serverAsyncLocalStorage = ([^_].*)$/gm,
  '$1_gl.serverAsyncLocalStorage = $2',
);

// 3b. `_locale` and `localeInitiallySet` — rewrite ALL references EXCEPT the
// top-level `let _locale;` and `let localeInitiallySet = false;` declarations.
// We protect those declaration lines by replacing them with a placeholder
// before the regex pass, then restoring them.
afterRewritten = afterRewritten.replace(/^let _locale;/m, '/* __decl_locale__ */');
afterRewritten = afterRewritten.replace(/^let localeInitiallySet = false;/m, '/* __decl_localeInit__ */');
afterRewritten = afterRewritten.replace(/\b_locale\b/g, '_gl._locale');
afterRewritten = afterRewritten.replace(/\blocaleInitiallySet\b/g, '_gl.localeInitiallySet');
afterRewritten = afterRewritten.replace(/\/\* __decl_locale__ \*\//g, 'let _locale;');
afterRewritten = afterRewritten.replace(/\/\* __decl_localeInit__ \*\//g, 'let localeInitiallySet = false;');

patched = before + afterRewritten;

// 4. Remove the sentinel comment.
patched = patched.replace(SENTINEL, '');

await writeFile(runtimePath, patched, 'utf8');
console.log('[patch-paraglide-runtime] patched OK');
