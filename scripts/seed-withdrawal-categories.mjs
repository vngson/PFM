/**
 * Seed script — tạo 3 category mặc định cho withdrawal ATM flow.
 *
 *   1. "Rút tiền ATM"   (expense) — trừ tiền rút thực tế từ ngân hàng rút
 *   2. "Chuyển tiền"    (expense) — trừ tiền từ nguồn khi nguồn ≠ ngân hàng rút
 *   3. "Nhận tiền ATM"  (income)  — cộng tiền vào ngân hàng rút khi nguồn ≠ ngân hàng rút
 *
 * Idempotent: ON CONFLICT (user_id, name, type) DO NOTHING.
 * Chạy: node --env-file=.env scripts/seed-withdrawal-categories.mjs <user_email>
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error(
    'Usage: node --env-file=.env scripts/seed-withdrawal-categories.mjs <user_email>',
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Sort_order dùng chung: nhóm withdrawal default đặt sau ATM fees (sort_order >= 230). */
const WITHDRAWAL_CATEGORIES = [
  { name: 'Rút tiền ATM',  type: 'expense', color: '#f97316', icon: 'Banknote', sort_order: 230 },
  { name: 'Chuyển tiền',   type: 'expense', color: '#3b82f6', icon: 'ArrowLeftRight', sort_order: 231 },
  { name: 'Nhận tiền ATM', type: 'income',  color: '#10b981', icon: 'ArrowDownLeft', sort_order: 232 },
];

async function main() {
  const { data: userData, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) {
    console.error('listUsers failed:', userErr.message);
    process.exit(1);
  }
  const user = userData.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No auth user found for email: ${email}`);
    process.exit(1);
  }
  console.log(`Seeding withdrawal categories for ${email} (id: ${user.id})`);

  let inserted = 0;
  let skipped = 0;
  for (const c of WITHDRAWAL_CATEGORIES) {
    const { error } = await admin.from('categories').insert({
      user_id: user.id,
      name: c.name,
      type: c.type,
      icon_name: c.icon,
      color: c.color,
      is_default: true,
      sort_order: c.sort_order,
    });
    if (error) {
      if (error.code === '23505') {
        skipped += 1;
        continue;
      }
      console.error(`Failed ${c.name}:`, error.message);
      process.exit(1);
    }
    inserted += 1;
    console.log(`  + ${c.name} (${c.type})`);
  }
  console.log(
    `\nDone. inserted=${inserted}, skipped=${skipped}, total=${WITHDRAWAL_CATEGORIES.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
