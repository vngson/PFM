// Pure helpers cho data export — dễ test, không phụ thuộc Supabase.
// Phase 03 (PDPD): audit metadata + rate limit + size guard.

export const EXPORT_SCHEMA_VERSION = '1.0';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';
export const MAX_EXPORT_BYTES = 5 * 1024 * 1024; // 5MB
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface ExportData {
  profile: unknown;
  accounts: unknown[];
  categories: unknown[];
  transactions: unknown[];
  recurring: unknown[];
  budgets: unknown[];
}

export interface ExportPayload {
  schema_version: string;
  app_version: string;
  exported_at: string;
  byte_size: number;
  user: { id: string; email: string };
  profile: unknown;
  accounts: unknown[];
  categories: unknown[];
  transactions: unknown[];
  recurring: unknown[];
  budgets: unknown[];
}

export function buildExportPayload(
  userId: string,
  email: string,
  data: ExportData,
): ExportPayload {
  const partial = {
    schema_version: EXPORT_SCHEMA_VERSION,
    app_version: APP_VERSION,
    exported_at: new Date().toISOString(),
    user: { id: userId, email },
    ...data,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(partial)).length;
  if (bytes > MAX_EXPORT_BYTES) {
    throw new Error(`Export exceeds 5MB limit (${bytes} bytes)`);
  }
  return { ...partial, byte_size: bytes };
}

export function shouldRateLimit(
  recentRequests: { requested_at: string }[],
  now: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): boolean {
  return recentRequests.some(
    (r) => now - new Date(r.requested_at).getTime() < windowMs,
  );
}