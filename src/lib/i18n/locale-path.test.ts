import { describe, it, expect } from 'vitest';
import { isKnownLocale, buildLocalizedHref } from './locale-path';

describe('isKnownLocale', () => {
  it('accepts known locales', () => {
    expect(isKnownLocale('vi')).toBe(true);
    expect(isKnownLocale('en')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isKnownLocale('fr')).toBe(false);
    expect(isKnownLocale(undefined)).toBe(false);
    expect(isKnownLocale('')).toBe(false);
  });
});

describe('buildLocalizedHref', () => {
  it('prefixes a single-segment path', () => {
    expect(buildLocalizedHref('/dashboard', 'vi')).toBe('/vi/dashboard');
    expect(buildLocalizedHref('/dashboard', 'en')).toBe('/en/dashboard');
  });

  it('returns the locale root for bare slash', () => {
    expect(buildLocalizedHref('/', 'vi')).toBe('/vi');
  });

  it('preserves nested segments', () => {
    expect(buildLocalizedHref('/a/b/c', 'en')).toBe('/en/a/b/c');
  });

  it('strips existing locale prefix before re-prefixing', () => {
    expect(buildLocalizedHref('/en/dashboard', 'vi')).toBe('/vi/dashboard');
    expect(buildLocalizedHref('/vi/dashboard', 'en')).toBe('/en/dashboard');
  });

  it('preserves unknown 2-letter segments (redirect-layer responsibility)', () => {
    expect(buildLocalizedHref('/fr/login', 'vi')).toBe('/vi/fr/login');
  });

  it('always prefixes baseLocale (vi)', () => {
    // The whole point of this helper — paraglide localizeHref drops prefix.
    expect(buildLocalizedHref('/dashboard', 'vi')).toBe('/vi/dashboard');
  });

  it('handles empty path', () => {
    expect(buildLocalizedHref('', 'vi')).toBe('/vi');
  });

  it('handles path with search + hash', () => {
    expect(buildLocalizedHref('/login?x=1#y', 'vi')).toBe('/vi/login?x=1#y');
  });
});