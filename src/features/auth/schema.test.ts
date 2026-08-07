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

describe('signupSchema with consent', () => {
  const fullT = { ...t, consent_required: () => 'consent required' };

  it('accepts valid input with consent=on', () => {
    const result = signupSchema(fullT).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      consent: 'on',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when consent field is missing', () => {
    const result = signupSchema(fullT).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.consent).toBeDefined();
  });

  it('rejects when consent !== "on"', () => {
    const result = signupSchema(fullT).safeParse({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      consent: 'true',
    });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.consent).toBeDefined();
  });
});