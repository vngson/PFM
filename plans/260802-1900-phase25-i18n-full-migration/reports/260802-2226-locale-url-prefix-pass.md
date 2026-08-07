# Phase 25 — URL Locale Prefix /[locale]/* — Pass

## Outcome

URL locale prefix working end-to-end. App routes served under `/[locale]/*`. Browser URLs now show `/en/login`, `/vi/login`, etc. `<html lang>` matches URL locale. `m.*()` resolves correct locale. Build passes.

## Verified

```
GET /en/login    → <html lang="en">    + "Sign in" / "Welcome back."
GET /vi/login    → <html lang="vi">    + "Đăng nhập"
GET /en/dashboard (unauth) → 307 → /en/login   (locale preserved)
GET /vi/dashboard (unauth) → 307 → /vi/login   (locale preserved)
Set-Cookie: PARAGLIDE_LOCALE=en present on /en/* responses
pnpm build → green
```

## Files Changed

### `src/proxy.ts`

Replaced cookie-injection pattern with header-injection. Detect locale from URL prefix BEFORE paraglide enters:

```ts
const url = new URL(request.url);
const segment = url.pathname.split('/').filter(Boolean)[0];
const localeFromUrl = (locales as readonly string[]).includes(segment ?? '')
  ? (segment as Locale)
  : undefined;
const localeValue = localeFromUrl ?? (baseLocale as Locale);

const fwdHeaders = new Headers(request.headers);
fwdHeaders.set('x-paraglide-locale', localeValue);

return paraglideMiddleware(request, async () => {
  const supabaseResponse = await updateSession(request);
  const response = NextResponse.next({ request: { headers: fwdHeaders } });
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  response.cookies.set('PARAGLIDE_LOCALE', localeValue, {
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
  });
  return response;
});
```

### `src/app/layout.tsx`

Read locale from header (which paraglide couldn't propagate to layout due to `cloneRequestWithFallback` stripping the original request). Switched from `await cookies()` to `await headers()`:

```ts
async function resolveHtmlLang(): Promise<string> {
  try {
    const h = await headers();
    const value = h.get("x-paraglide-locale");
    if (value && (locales as readonly string[]).includes(value)) {
      return value;
    }
  } catch {}
  return baseLocale;
}
```

## Why Cookie Path Failed

`paraglideMiddleware` in `src/paraglide/server.js` line 142 calls `cloneRequestWithFallback(request, runtime.deLocalizeUrl(url))` — creates a plain `new Request()` that LOSES the NextRequest's `.cookies` extension AND any cookie set via `request.cookies.set()`. So even though proxy mutated the NextRequest cookie store, the request passed downstream was a fresh plain Request without it.

`NextResponse.next({ request: { headers: fwdHeaders } })` does propagate headers to the layout's `headers()` reader — verified by curl that returned `allKeys=...x-paraglide-locale...` after I added it.

## Architecture

```
Browser requests /en/login
   ↓
proxy.ts:
  1. URL segment → 'en' → localeValue = 'en'
  2. Clone NextRequest headers + add x-paraglide-locale: en
  3. Enter paraglideMiddleware (sets AsyncLocalStorage, de-localizes URL)
     └─ resolve() callback:
        - updateSession(request) — Supabase auth refresh, returns its own response
        - NextResponse.next({ request: { headers: fwdHeaders } }) — forward locale header upstream
        - Copy supabase cookies to our response
        - Set PARAGLIDE_LOCALE cookie on response (browser persistence)
        - Return response
   ↓
paraglide async-local-storage is active for m.*() in RSC
   ↓
RSC render:
  - root layout.tsx: headers().get('x-paraglide-locale') = 'en' → <html lang="en">
  - [locale]/layout.tsx: params.locale = 'en' → setLocale('en')
  - login-form.tsx: m.auth_login_title() → "Sign in"
```

## Benefits of the Final Pattern

- **Single source of locale truth**: URL prefix. Cookie is just an optimization for browser persistence.
- **No race**: header is set BEFORE paraglide's cloneRequestWithFallback discards request state.
- **Supabase auth still works**: `updateSession(request)` uses the original NextRequest with all cookies intact.
- **m.*() works in both client and server components**: AsyncLocalStorage set by paraglide is the same one our patched runtime reads via `globalThis.__paraglide_state`.

## Known Limitations

- `updateSession` happens AFTER paraglideMiddleware's locale resolution. Currently updateSession doesn't need locale, but if server actions need to know locale, they'd need an alternative path.
- Redirect targets are picked by app code via `localizeHref()` — those are already correct (Phase 25.6 work).
- Duplicate `Set-Cookie: PARAGLIDE_LOCALE=...` header on responses (one from middleware-level cookie set, one from response.cookies.set). Harmless — browser uses last — but could be deduplicated.

## Out of Scope (Future)

- Locale negotiation via Accept-Language for first visit (currently relies on explicit /vi/* or /en/* URL).
- Strip default locale from URLs (currently /vi/login works alongside /login for baseLocale vi).
