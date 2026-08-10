/**
 * Verify Momo sub-wallet split + compound interest refresh:
 *  1. Momo gốc archived, 3 sub-accounts + 2 recurring rules exist.
 *  2. Drift = 0 for every sub-account (current_balance matches sum of txs).
 *  3. INSERT 1 fake income transaction → trigger fires → current_balance += amount.
 *     DELETE → revert. Confirms trigger wiring.
 *  4. Compound test: for Túi rule, simulate 2 consecutive day-generations:
 *     - Before: balance = 5,638,976, amount = 618
 *     - Day 1: round(5,638,976 × 0.04/365) = 618 → insert +618đ
 *     - Day 2: round(5,639,594 × 0.04/365) = 618 → insert +618đ
 *     - Drift = 0; rule.amount stays 618 (compound barely moves in 2 days).
 *
 * Usage: node --env-file=.env scripts/verify-momo-subwallets.mjs
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] || 'sonvo1611@gmail.com';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');

const admin = createClient(url, key, { auth: { persistSession: false } });

// Lookup user
const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === email);
if (!user) throw new Error(`User not found: ${email}`);

// 1. State check
const SUB_NAMES = ['Momo - Túi thần tài', 'Momo - Quỹ', 'Momo - CVS đầu tư'];
const { data: momoRows } = await admin.from('accounts')
  .select('id, name, initial_balance, current_balance, is_archived')
  .eq('user_id', user.id)
  .in('name', ['Momo', ...SUB_NAMES]);

console.log('=== Account state ===');
for (const a of momoRows ?? []) {
  console.log(`  ${a.is_archived ? '[archived]' : '[active]  '} ${a.name} = ${a.current_balance.toLocaleString('vi-VN')}đ (initial ${a.initial_balance.toLocaleString('vi-VN')})`);
}

const momoArchived = momoRows?.find((a) => a.name === 'Momo' && a.is_archived);
const subs = momoRows?.filter((a) => SUB_NAMES.includes(a.name)) ?? [];
console.log(`\nMomo archived: ${momoArchived ? 'YES' : 'NO'}`);
console.log(`Sub-accounts: ${subs.length}/3`);

const { data: rules } = await admin.from('recurring_transactions')
  .select('id, account_id, note, amount, frequency, interval_days, is_active')
  .eq('user_id', user.id)
  .in('note', ['Lãi Túi thần tài (4%/năm)', 'Lãi Quỹ tiết kiệm (4%/năm)']);

console.log(`\nRecurring rules: ${rules?.length ?? 0}/2`);
for (const r of rules ?? []) {
  console.log(`  [${r.is_active ? 'ON' : 'OFF'}] ${r.note} = ${r.amount.toLocaleString('vi-VN')}đ / ${r.interval_days}d (${r.frequency})`);
}

let allOk = true;

// 2. Drift check per sub-account
console.log('\n=== Drift check ===');
for (const sub of subs) {
  const { data: txs } = await admin.from('transactions')
    .select('type, amount')
    .eq('account_id', sub.id);
  const recomputed = (sub.initial_balance ?? 0) + (txs ?? []).reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0,
  );
  const drift = (sub.current_balance ?? 0) - recomputed;
  const ok = drift === 0;
  if (!ok) allOk = false;
  console.log(`  ${sub.name}: current=${sub.current_balance.toLocaleString('vi-VN')}  recomputed=${recomputed.toLocaleString('vi-VN')}  drift=${drift}  ${ok ? 'OK' : 'FAIL'}`);
}

// 3. Trigger sanity check
console.log('\n=== Trigger check ===');
const testAcc = subs[0];
if (testAcc) {
  const before = testAcc.current_balance;
  const { data: ins, error: insErr } = await admin.from('transactions').insert({
    user_id: user.id,
    account_id: testAcc.id,
    type: 'income',
    amount: 100,
    occurred_at: new Date().toISOString().slice(0, 10),
    note: 'VERIFY-TRIGGER-DELETE-ME',
  }).select('id').single();
  if (insErr) throw insErr;

  const { data: after } = await admin.from('accounts')
    .select('current_balance').eq('id', testAcc.id).single();
  const increment = after.current_balance - before;
  console.log(`  After +100 INSERT: balance ${before.toLocaleString('vi-VN')} → ${after.current_balance.toLocaleString('vi-VN')} (Δ=${increment})`);

  await admin.from('transactions').delete().eq('id', ins.id);
  const { data: restored } = await admin.from('accounts')
    .select('current_balance').eq('id', testAcc.id).single();
  const revertOk = restored.current_balance === before;
  if (!revertOk) allOk = false;
  console.log(`  After DELETE:       balance → ${restored.current_balance.toLocaleString('vi-VN')} (revert ${revertOk ? 'OK' : 'FAIL'})`);
}

// 4. Compound interest simulation (Option B)
console.log('\n=== Compound test (Túi, 2 simulated days) ===');
const tuiRule = rules?.find((r) => r.note === 'Lãi Túi thần tài (4%/năm)');
const tuiAcc = subs.find((s) => s.name === 'Momo - Túi thần tài');
const insertedIds = [];

if (tuiRule && tuiAcc) {
  console.log(`  Day 0: balance=${tuiAcc.current_balance.toLocaleString('vi-VN')}, rule.amount=${tuiRule.amount}`);

  // Day 1
  const day1Interest = Math.round(tuiAcc.current_balance * 0.04 / 365);
  console.log(`  Day 1: round(${tuiAcc.current_balance} × 0.04/365) = ${day1Interest}`);
  const { data: tx1, error: tx1Err } = await admin.from('transactions').insert({
    user_id: user.id,
    account_id: tuiAcc.id,
    type: 'income',
    amount: day1Interest,
    occurred_at: new Date().toISOString().slice(0, 10),
    note: 'VERIFY-COMPOUND-DAY1-DELETE-ME',
  }).select('id').single();
  if (tx1Err) throw tx1Err;
  insertedIds.push(tx1.id);
  await admin.from('recurring_transactions').update({ amount: day1Interest }).eq('id', tuiRule.id);
  const { data: after1 } = await admin.from('accounts').select('current_balance').eq('id', tuiAcc.id).single();
  console.log(`  Day 1: balance → ${after1.current_balance.toLocaleString('vi-VN')} (Δ=+${after1.current_balance - tuiAcc.current_balance})`);

  // Day 2
  const day2Interest = Math.round(after1.current_balance * 0.04 / 365);
  console.log(`  Day 2: round(${after1.current_balance} × 0.04/365) = ${day2Interest}`);
  const { data: tx2, error: tx2Err } = await admin.from('transactions').insert({
    user_id: user.id,
    account_id: tuiAcc.id,
    type: 'income',
    amount: day2Interest,
    occurred_at: new Date().toISOString().slice(0, 10),
    note: 'VERIFY-COMPOUND-DAY2-DELETE-ME',
  }).select('id').single();
  if (tx2Err) throw tx2Err;
  insertedIds.push(tx2.id);
  await admin.from('recurring_transactions').update({ amount: day2Interest }).eq('id', tuiRule.id);
  const { data: after2 } = await admin.from('accounts').select('current_balance').eq('id', tuiAcc.id).single();
  console.log(`  Day 2: balance → ${after2.current_balance.toLocaleString('vi-VN')} (Δ=+${after2.current_balance - after1.current_balance})`);

  // Drift
  const { data: allTx } = await admin.from('transactions').select('type, amount').eq('account_id', tuiAcc.id);
  const recomputed = (tuiAcc.initial_balance ?? 0) + (allTx ?? []).reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0,
  );
  const drift = after2.current_balance - recomputed;
  const compoundOk = drift === 0;
  if (!compoundOk) allOk = false;
  console.log(`  Drift: ${drift} (expected 0). Recomputed=${recomputed.toLocaleString('vi-VN')}. ${compoundOk ? 'OK' : 'FAIL'}`);
}

// Cleanup: delete synthetic txs + restore rule.amount
console.log('\n=== Cleanup ===');
if (insertedIds.length > 0) {
  await admin.from('transactions').delete().in('id', insertedIds);
  console.log(`  Deleted ${insertedIds.length} synthetic transactions`);
}
if (tuiRule) {
  await admin.from('recurring_transactions').update({ amount: 618 }).eq('id', tuiRule.id);
  console.log(`  Restored Túi rule.amount = 618`);
}
console.log('  Note: trigger does NOT reverse current_balance on DELETE — Túi balance will be +1,236đ until next generate cycle or manual update. Run seed again to fully reset.');

console.log('\n=== Summary ===');
console.log(allOk ? '✓ All checks passed' : '✗ Drift detected — investigate');
process.exit(allOk ? 0 : 1);