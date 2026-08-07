import { describe, it, expect } from 'vitest';
import { loadLegalDoc } from './load-legal-doc';

describe('loadLegalDoc', () => {
  it('returns vi.md for locale=vi (privacy)', async () => {
    const content = await loadLegalDoc('privacy', 'vi');
    expect(content).toContain('Chính sách');
  });

  it('returns en.md for locale=en (privacy)', async () => {
    const content = await loadLegalDoc('privacy', 'en');
    expect(content.toLowerCase()).toContain('privacy');
  });

  it('returns vi.md for locale=vi (terms)', async () => {
    const content = await loadLegalDoc('terms', 'vi');
    expect(content).toContain('Điều khoản');
  });

  it('returns en.md for locale=en (terms)', async () => {
    const content = await loadLegalDoc('terms', 'en');
    expect(content.toLowerCase()).toContain('terms');
  });

  it('falls back to vi.md for unknown locale', async () => {
    const content = await loadLegalDoc('privacy', 'fr' as 'vi' | 'en');
    expect(content).toContain('Chính sách');
  });
});