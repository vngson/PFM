import { describe, it, expect } from 'vitest';
import { computeDaysRemaining } from './countdown';

describe('computeDaysRemaining', () => {
  it('returns positive days when purge date is in future', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const days = computeDaysRemaining(future);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(5);
  });

  it('returns 0 when purge date is in the past', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(computeDaysRemaining(past)).toBe(0);
  });

  it('returns 0 when scheduled_purge_at is null', () => {
    expect(computeDaysRemaining(null)).toBe(0);
  });

  it('returns 0 when scheduled_purge_at is empty string', () => {
    expect(computeDaysRemaining('')).toBe(0);
  });
});