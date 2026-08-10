/**
 * Debug Momo account balance — print raw DB state + recompute from transactions.
 *
 * Usage:
 *   node scripts/check-momo-balance.mjs sonvo1611@gmail.com
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] || 'sonvo1611@gmail.com';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === email);
if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}
console.log(`User: ${user.email} (${user.id})\n`);

// 1. Momo account row
const { data: accounts } = await admin
  .from('accounts')
  .select('id, name, initial_balance, current_balance, currency_code, is_archived, created_at, updated_at')
  .eq('user_id', user.id)
  .ilike('name', '%momo%');

if (!accounts?.length) {
  console.error('No account matching "%momo%"');
  process.exit(1);
}
console.log('=== Momo account(s) ===');
for (const a of accounts) {
  console.log(JSON.stringify(a, null, 2));
}

const momo = accounts.find((a) => !a.is_archived) ?? accounts[0];

// 2. All transactions touching Momo
const { data: txs } = await admin
  .from('transactions')
  .select('id, type, amount, account_id, category_id, occurred_at, created_at, updated_at, note')
  .eq('account_id', momo.id)
  .order('occurred_at', { ascending: true })
  .order('created_at', { ascending: true });

console.log(`\n=== Transactions on Momo (${txs?.length ?? 0}) ===`);
for (const t of txs ?? []) {
  console.log(
    `${t.occurred_at}  ${t.type.padEnd(8)}  ${String(t.amount).padStart(12)}  cat=${t.category_id ?? 'null'}  ${t.note ?? ''}`,
  );
}

// 3. Recompute from scratch
const recomputed = (momo.initial_balance ?? 0) + (txs ?? []).reduce((sum, t) => {
  return sum + (t.type === 'income' ? t.amount : -t.amount);
}, 0);
console.log(`\n=== Balance check ===`);
console.log(`initial_balance:     ${momo.initial_balance}`);
console.log(`current_balance:     ${momo.current_balance}  (cached)`);
console.log(`recomputed:          ${recomputed}            (initial + sum(income) - sum(others))`);
console.log(`drift:               ${(momo.current_balance ?? 0) - recomputed}`);

// 4. Sanity: leftover type='transfer' rows for this user
const { count: transferCount } = await admin
  .from('transactions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('type', 'transfer');
console.log(`\ntype='transfer' rows for user: ${transferCount ?? 0}`);

// 5. Account.updated_at vs latest tx.updated_at on this account
const lastTxAt = (txs ?? []).reduce((max, t) => (t.updated_at > max ? t.updated_at : max), null);
console.log(`\naccount.updated_at:  ${momo.updated_at}`);
console.log(`last tx.updated_at:  ${lastTxAt ?? '(no tx)'}`);
console.log(
  `account updated AFTER last tx? ${momo.updated_at > (lastTxAt ?? '0000') ? 'YES — possible direct UPDATE' : 'no'}`,
);
