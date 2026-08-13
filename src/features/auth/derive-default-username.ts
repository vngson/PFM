// Pure helpers cho username derivation/validation.
// Tách riêng khỏi actions.ts vì Next.js Server Actions rule: mọi export từ
// file `'use server'` phải là async function. Helper sync không được export
// từ file có directive đó.

/**
 * Derive default username từ email localPart.
 * - Lowercase, replace ký tự ngoài [a-z0-9_.] thành `_`.
 * - Pad lên 3 nếu quá ngắn (vd `ab@x.co` → `abx`).
 * - Slice 32 nếu quá dài.
 *
 * Edge cases:
 * - `sonvo1611@gmail.com` → `sonvo1611`
 * - `john+test@gmail.com` → `john_test`
 * - `ab@x.co` → `abx`
 */
export function deriveDefaultUsername(email: string): string {
  const localPart = email.split('@')[0]?.toLowerCase() ?? '';
  const sanitized = localPart.replace(/[^a-z0-9_.]/g, '_');
  if (sanitized.length < 3) {
    return `${sanitized}${'x'.repeat(3 - sanitized.length)}`;
  }
  if (sanitized.length > 32) {
    return sanitized.slice(0, 32);
  }
  return sanitized;
}
