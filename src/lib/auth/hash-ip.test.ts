import { describe, it, expect } from 'vitest';
import { hashIp } from './hash-ip';

describe('hashIp', () => {
  it('returns null for null input', () => {
    expect(hashIp(null)).toBe(null);
  });

  it('returns null for undefined input', () => {
    expect(hashIp(undefined)).toBe(null);
  });

  it('returns null for empty string', () => {
    expect(hashIp('')).toBe(null);
  });

  it('returns SHA-256 hex for single IP', () => {
    const hash = hashIp('192.168.1.1');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('takes first IP from comma-separated list', () => {
    const hash1 = hashIp('203.0.113.1, 10.0.0.1, 192.168.1.1');
    const hash2 = hashIp('203.0.113.1');
    expect(hash1).toBe(hash2);
  });

  it('returns deterministic hash for same IP', () => {
    expect(hashIp('10.0.0.1')).toBe(hashIp('10.0.0.1'));
  });

  it('returns different hash for different IPs', () => {
    expect(hashIp('10.0.0.1')).not.toBe(hashIp('10.0.0.2'));
  });
});