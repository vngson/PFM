/**
 * Seed script — tạo các category phí ATM cho user chỉ định.
 * Mỗi category gắn `withdrawal_fee` (numeric) để withdrawal form auto-fill.
 * Idempotent: dùng ON CONFLICT (user_id, name, type) DO NOTHING.
 *
 * Chạy: node --env-file=.env scripts/seed-atm-fees.mjs <user_email>
 *
 * Lưu ý về phí:
 * - Mức phí dưới đây là *default* cho form, user có thể sửa trước khi submit.
 * - Agribank: 1100đ/lần (theo user confirm). Còn lại dùng mức phổ biến tại
 *   Việt Nam cho ATM nội địa năm 2024. User có thể edit lại trong /categories.
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node --env-file=.env scripts/seed-atm-fees.mjs <user_email>');
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

/** Sort order dùng chung: nhóm phí ATM đặt sau các category mặc định (sort_order >= 200). */
const ATM_FEE_CATEGORIES = [
  { name: 'Phí ATM Agribank',    withdrawal_fee: 1100, color: '#dc2626', icon: 'Landmark',      sort_order: 210 },
  { name: 'Phí ATM Vietcombank', withdrawal_fee: 3300, color: '#0ea5e9', icon: 'Landmark',      sort_order: 211 },
  { name: 'Phí ATM BIDV',        withdrawal_fee: 1100, color: '#16a34a', icon: 'Landmark',      sort_order: 212 },
  { name: 'Phí ATM Techcombank', withdrawal_fee: 1100, color: '#f59e0b', icon: 'Landmark',      sort_order: 213 },
  { name: 'Phí ATM MB Bank',     withdrawal_fee: 1100, color: '#a855f7', icon: 'Landmark',      sort_order: 214 },
  { name: 'Phí ATM ACB',         withdrawal_fee: 2200, color: '#ec4899', icon: 'Landmark',      sort_order: 215 },
  { name: 'Phí ATM TPBank',      withdrawal_fee: 2200, color: '#6366f1', icon: 'Landmark',      sort_order: 216 },
  { name: 'Phí ATM Sacombank',   withdrawal_fee: 3300, color: '#0891b2', icon: 'Landmark',      sort_order: 217 },
  { name: 'Phí ATM VietinBank',  withdrawal_fee: 1100, color: '#eab308', icon: 'Landmark',      sort_order: 218 },
  { name: 'Phí ATM HD Bank',     withdrawal_fee: 2200, color: '#7c3aed', icon: 'Landmark',      sort_order: 219 },
];

async function main() {
  // Lookup user theo email (admin API).
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
  console.log(`Seeding ATM fee categories for ${email} (id: ${user.id})`);

  let inserted = 0;
  let skipped = 0;
  for (const c of ATM_FEE_CATEGORIES) {
    const { error } = await admin.from('categories').insert({
      user_id: user.id,
      name: c.name,
      type: 'expense',
      icon_name: c.icon,
      color: c.color,
      is_default: true,
      sort_order: c.sort_order,
      withdrawal_fee: c.withdrawal_fee,
    });
    if (error) {
      if (error.code === '23505') {
        // unique violation → đã tồn tại, skip.
        skipped += 1;
        continue;
      }
      console.error(`Failed ${c.name}:`, error.message);
      process.exit(1);
    }
    inserted += 1;
    console.log(`  + ${c.name} (${c.withdrawal_fee.toLocaleString('vi-VN')}đ/lần)`);
  }
  console.log(`\nDone. inserted=${inserted}, skipped=${skipped}, total=${ATM_FEE_CATEGORIES.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
