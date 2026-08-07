import { createHash } from 'node:crypto';

// SHA-256 hash IP for PDPD-compliant audit logging.
// Returns null for empty/missing input so callers can persist nullable column.
// Comma-separated IPs: takes the FIRST (original client) before any proxy chain.
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const first = ip.split(',')[0]?.trim();
  if (!first) return null;
  return createHash('sha256').update(first).digest('hex');
}