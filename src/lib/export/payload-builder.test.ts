import { describe, it, expect } from 'vitest';
import {
  buildExportPayload,
  MAX_EXPORT_BYTES,
  shouldRateLimit,
} from './payload-builder';

describe('buildExportPayload', () => {
  const emptyData = {
    profile: null,
    accounts: [],
    categories: [],
    transactions: [],
    recurring: [],
    budgets: [],
  };

  it('includes schema_version, app_version, exported_at, byte_size', () => {
    const p = buildExportPayload('user-1', 'a@b.com', emptyData);
    expect(p.schema_version).toBe('1.0');
    expect(p.app_version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(p.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof p.byte_size).toBe('number');
    expect(p.byte_size).toBeGreaterThan(0);
  });

  it('includes user info', () => {
    const p = buildExportPayload('user-1', 'a@b.com', emptyData);
    expect(p.user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('throws when exceeds 5MB', () => {
    const huge = 'x'.repeat(MAX_EXPORT_BYTES + 1);
    expect(() =>
      buildExportPayload('u', 'e', {
        ...emptyData,
        budgets: [{ id: 'b', note: huge }] as unknown[],
      }),
    ).toThrow(/exceeds 5MB/);
  });
});

describe('shouldRateLimit', () => {
  it('allows when no recent requests', () => {
    expect(shouldRateLimit([], Date.now())).toBe(false);
  });

  it('blocks when 1+ request in last hour', () => {
    const recent = [{ requested_at: new Date().toISOString() }];
    expect(shouldRateLimit(recent, Date.now())).toBe(true);
  });

  it('allows after 1 hour passes', () => {
    const oldTs = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(shouldRateLimit([{ requested_at: oldTs }], Date.now())).toBe(false);
  });

  it('blocks at exactly 59 minutes', () => {
    const ts = new Date(Date.now() - 59 * 60 * 1000).toISOString();
    expect(shouldRateLimit([{ requested_at: ts }], Date.now())).toBe(true);
  });
});