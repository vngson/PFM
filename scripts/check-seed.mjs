/**
 * Verify seed — print categories + recurring đã insert cho user chỉ định.
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] || 'sonvo1611@gmail.com';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === email);
if (!user) {
  console.error('User not found');
  process.exit(1);
}
console.log(`User: ${user.email}\n`);

// Categories (chỉ 3 mới seed + is_default flag check)
const { data: cats } = await admin
  .from('categories')
  .select('id, name, icon_name, color, is_default, sort_order')
  .eq('user_id', user.id)
  .order('type', { ascending: true })
  .order('sort_order', { ascending: true });

console.log('=== Categories ===');
const target = new Set([
  'Phí định kỳ (ngân hàng)',
  'Phí mạng cho wintel',
  'Phí mạng cho Viettel',
]);
for (const c of cats ?? []) {
  if (target.has(c.name)) {
    console.log(`  ✓ ${c.name}  [${c.icon_name}] ${c.color} (is_default=${c.is_default})`);
  }
}

// Recurring
const { data: recs } = await admin
  .from('recurring_transactions')
  .select('id, note, amount, frequency, interval_days, next_run_at, is_active, category_id, account_id')
  .eq('user_id', user.id);

console.log('\n=== Recurring ===');
for (const r of recs ?? []) {
  const cat = cats?.find((c) => c.id === r.category_id);
  console.log(
    `  • ${r.note.padEnd(28)} ${String(r.amount).padStart(10)} đ  ${r.frequency}${
      r.interval_days ? `(every ${r.interval_days}d)` : ''
    }  next=${r.next_run_at}  cat=${cat?.name ?? '?'}  active=${r.is_active}`,
  );
}

// FK integrity check — mọi recurring phải có category_id resolve được
const orphan = (recs ?? []).filter((r) => !cats?.find((c) => c.id === r.category_id));
if (orphan.length > 0) {
  console.error(`\n✗ ${orphan.length} orphan recurring rows:`, orphan);
  process.exit(1);
} else {
  console.log('\n✓ FK integrity OK — all recurring have valid category_id');
}
