import 'server-only';

// Admin Supabase client — uses the service_role key to bypass RLS.
// MUST be server-only. Never import this file from a Client Component.
// Use cases (PDPD): insert immutable consent_records on signup.

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY required for admin client. Check .env.local.',
    );
  }
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}