---
phase: 02
title: "Consent Checkbox ở Signup"
status: pending
priority: P1
dependencies: [01]
---

# Phase 02: Consent Checkbox ở Signup

## Overview
Thêm checkbox "Tôi đồng ý với Điều khoản & Chính sách bảo mật" ở form signup. Server action reject nếu thiếu consent. Đây là yêu cầu Điều 9 PDPD (đồng ý trước khi xử lý).

## Requirements
- **Functional**:
  - Checkbox required trong signup form
  - Text kèm link tới `/[locale]/privacy` + `/[locale]/terms`
  - Server action reject với error message localized
  - Zod validation: `consent: z.literal('on', { message: ... })`
- **Non-functional**:
  - HTML5 validation (`required`) + server-side check (defense in depth)
  - Accessible: `<label>` wraps checkbox, ARIA error message

## Architecture

```
SignupForm (client) → form action submit FormData
  ↓
signupAction (server) → zod parse → reject nếu consent !== 'on'
  ↓
Create auth.users + profiles
```

## Related Code Files
- Modify: `src/features/auth/schema.ts` (thêm `consent: z.literal('on', ...)`)
- Modify: `src/features/auth/signup-form.tsx` (thêm checkbox UI)
- Modify: `src/features/auth/actions.ts` (`signupAction` — pass `consent: formData.get('consent')` to schema factory + add error message to messages map)
- Modify: `src/features/auth/types.ts` (thêm `consent_required: () => string` vào `AuthMessages`)
- Modify: `messages/vi.json` + `messages/en.json` (thêm messages: consent prefix, privacy link, terms link, required error)

## Implementation Steps

1. **Thêm schema field** trong `signupSchema`:
   ```ts
   consent: z.literal('on', { message: t.consent_required() }),
   ```

2. **Thêm messages** cho paraglide:
   ```json
   // messages/vi.json
   {
     "auth_consent_prefix": "Tôi đồng ý với",
     "auth_consent_privacy": "Chính sách bảo mật",
     "auth_consent_and": "và",
     "auth_consent_terms": "Điều khoản sử dụng"
   }
   ```
   Sau đó chạy `pnpm paraglide-compile` (đã có trong project).

3. **Thêm checkbox UI** trong `signup-form.tsx`:
   ```tsx
   <div className="flex items-start gap-2 pt-2">
     <input
       id="consent"
       name="consent"
       type="checkbox"
       required
       aria-required="true"
       aria-invalid={!!fieldError('consent')}
       className="mt-1 size-4 shrink-0 border-2 border-border"
     />
     <label htmlFor="consent" className="text-xs leading-relaxed text-muted-foreground">
       {m.auth_consent_prefix()}{' '}
       <Link href={buildLocalizedHref('/privacy', getLocale())}
             className="font-bold text-foreground underline">
         {m.auth_consent_privacy()}
       </Link>
       {' '}{m.auth_consent_and()}{' '}
       <Link href={buildLocalizedHref('/terms', getLocale())}
             className="font-bold text-foreground underline">
         {m.auth_consent_terms()}
       </Link>
     </label>
   </div>
   {fieldError('consent') ? (
     <p className="text-xs text-destructive">⚠ {fieldError('consent')}</p>
   ) : null}
   ```

4. **Modify `signupAction`** — current code chỉ parse `{username, email, password}` và silently drop `consent`. Fix:
   ```ts
   const parsed = signupSchema(t).safeParse({
     username: formData.get('username'),
     email: formData.get('email'),
     password: formData.get('password'),
     consent: formData.get('consent'), // ADD THIS
   });
   if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
   ```

5. **Extend `AuthMessages` type** trong `src/features/auth/types.ts`:
   ```ts
   export interface AuthMessages {
     username_min: () => string;
     username_max: () => string;
     username_charset: () => string;
     email_invalid: () => string;
     password_min: () => string;
     password_max: () => string;
     password_required: () => string;
     consent_required: () => string; // ADD THIS
   }
   ```

6. **Add message key** vào messages map trong actions.ts:
   ```ts
   const t = {
     username_min: m.username_min,
     // ... existing keys ...
     consent_required: m.zod_consent_required, // ADD THIS — phải tồn tại trong vi.json/en.json
   };
   ```

## Tests (TDD)

### Test 1: schema validation
```ts
// src/features/auth/schema.test.ts
import { describe, it, expect } from 'vitest';
import { signupSchema } from './schema';

const t = {
  username_min: () => 'min 3',
  username_max: () => 'max 32',
  username_charset: () => 'a-z 0-9 _ .',
  email_invalid: () => 'invalid email',
  password_min: () => 'min 8',
  password_max: () => 'max 72',
  password_required: () => 'required',
  consent_required: () => 'consent required',
};

describe('signupSchema', () => {
  it('accepts valid input with consent=on', () => {
    const result = signupSchema(t).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      consent: 'on',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when consent is missing', () => {
    const result = signupSchema(t).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.consent).toBeDefined();
  });

  it('rejects when consent !== "on"', () => {
    const result = signupSchema(t).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      consent: 'true', // boolean string
    });
    expect(result.success).toBe(false);
  });
});
```

### Test 2: form behavior
Manual test:
- Mở `/vi/signup`, không tick checkbox → click submit → HTML5 `required` block submit
- Tick checkbox → submit thành công → redirect `/vi/check-email`
- Click link "Chính sách bảo mật" → mở tab `/vi/privacy`

## Success Criteria
- [ ] `pnpm vitest run` → tests pass (3 test cases mới)
- [ ] `pnpm build` → build OK
- [ ] `pnpm tsc --noEmit` → clean
- [ ] Submit signup form không tick consent → bị reject với error message
- [ ] Submit signup form có tick consent → flow bình thường
- [ ] Links trong form mở đúng `/[locale]/privacy` + `/[locale]/terms`
- [ ] Paraglide messages sync (chạy `pnpm paraglide-compile`)

## Risk Assessment
- **Risk**: User click "I agree" mà không đọc → vẫn hợp pháp (click-wrap chuẩn)
  - **Mitigation**: Giữ nguyên UX đơn giản, version+timestamp sẽ lưu ở Phase 05
- **Risk**: Zod `z.literal('on')` chỉ chấp nhận string `'on'` — không match boolean
  - **Mitigation**: HTML checkbox submit value là `'on'` (khi checked) hoặc không có field (khi unchecked). Default browser behavior OK.
- **Risk**: Existing signup tests break
  - **Mitigation**: Update test fixtures nếu có (search `signupSchema` usage)