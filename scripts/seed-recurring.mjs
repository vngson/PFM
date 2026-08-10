/**
 * Seed script — tạo 3 expense categories + 4 recurring rules cho user chỉ định.
 * Dùng service_role để bypass RLS.
 *
 * Chạy: node --env-file=.env scripts/seed-recurring.mjs <user_email>
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node --env-file=.env scripts/seed-recurring.mjs <user_email>');
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

/** Trả về ngày 10 của tháng kế tiếp (UTC). */
function nextMonthlyDay10() {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const next = new Date(Date.UTC(year, month + 1, 10));
  return next.toISOString().slice(0, 10);
}

/**
 * Warm PostgREST schema cache. Returns true nếu interval_days đã được biết đến.
 * Cache thường auto-refresh trong vài giây; poll + retry.
 */
async function waitForSchema(maxWaitMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const probe = await admin.from('recurring_transactions').select('interval_days').limit(0);
    if (!probe.error) return true;
    if (probe.error.code !== 'PGRST204') throw probe.error;
    console.log('  ...waiting for schema cache refresh');
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

async function main() {
  // 0. Warm PostgREST cache (interval_days mới thêm vào schema)
  console.log('Warming PostgREST schema cache...');
  const ok = await waitForSchema();
  if (!ok) {
    console.error('Schema cache still stale after 90s. Manual intervention needed.');
    process.exit(1);
  }
  console.log('✓ Schema ready');

  // 1. Tìm user theo email
  const { data: userList, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = userList.users.find((u) => u.email === email);
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  console.log(`✓ Found user: ${user.email} (${user.id})`);

  // 2. Lấy account mặc định đầu tiên (không archived)
  const { data: accounts, error: accErr } = await admin
    .from('accounts')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })
    .limit(1);
  if (accErr) throw accErr;
  if (!accounts || accounts.length === 0) {
    console.error('No active account found for user. Create one first.');
    process.exit(1);
  }
  const account = accounts[0];
  console.log(`✓ Using account: ${account.name} (${account.id})`);

  // 3. Seed categories — idempotent
  const categories = [
    { name: 'Phí định kỳ (ngân hàng)', icon_name: 'Building2', color: '#6366f1' },
    { name: 'Phí mạng cho wintel', icon_name: 'Wifi', color: '#0ea5e9' },
    { name: 'Phí mạng cho Viettel', icon_name: 'Wifi', color: '#ef4444' },
  ];

  const { data: existingCats, error: catErr } = await admin
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id)
    .in('name', categories.map((c) => c.name));
  if (catErr) throw catErr;

  const existingNames = new Set((existingCats ?? []).map((c) => c.name));
  const newCats = categories.filter((c) => !existingNames.has(c.name));

  if (newCats.length > 0) {
    const { error: insCatErr } = await admin.from('categories').insert(
      newCats.map((c, i) => ({
        user_id: user.id,
        name: c.name,
        type: 'expense',
        icon_name: c.icon_name,
        color: c.color,
        is_default: false,
        sort_order: 100 + i,
      })),
    );
    if (insCatErr) throw insCatErr;
    console.log(`✓ Inserted ${newCats.length} new categories`);
  } else {
    console.log('✓ All 3 categories already exist');
  }

  // 4. Lấy lại full list categories
  const { data: allCats, error: catFetchErr } = await admin
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('type', 'expense');
  if (catFetchErr) throw catFetchErr;

  const catByName = Object.fromEntries((allCats ?? []).map((c) => [c.name, c.id]));
  const catAgribank = catByName['Phí định kỳ (ngân hàng)'];
  const catWintel = catByName['Phí mạng cho wintel'];
  const catViettel = catByName['Phí mạng cho Viettel'];

  if (!catAgribank || !catWintel || !catViettel) {
    console.error('Category lookup failed after insert');
    process.exit(1);
  }

  // 5. Seed recurring
  const today = new Date().toISOString().slice(0, 10);

  const recurring = [
    {
      note: 'Phí định kỳ Agribank',
      amount: 19800,
      frequency: 'every_n_days',
      interval_days: 30,
      category_id: catAgribank,
      next_run_at: today,
      start_date: today,
    },
    {
      note: 'Tiền nhà',
      amount: 1000000,
      frequency: 'monthly',
      interval_days: null,
      category_id: catAgribank,
      next_run_at: nextMonthlyDay10(),
      start_date: today,
    },
    {
      note: 'Tiền mạng wintel',
      amount: 70000,
      frequency: 'every_n_days',
      interval_days: 30,
      category_id: catWintel,
      next_run_at: today,
      start_date: today,
    },
    {
      note: 'Tiền mạng viettel',
      amount: 150000,
      frequency: 'every_n_days',
      interval_days: 90,
      category_id: catViettel,
      next_run_at: today,
      start_date: today,
    },
  ];

  const { data: existingRecurring, error: recErr } = await admin
    .from('recurring_transactions')
    .select('id, note, amount')
    .eq('user_id', user.id);
  if (recErr) throw recErr;

  const existingKeys = new Set(
    (existingRecurring ?? []).map((r) => `${r.note}::${r.amount}`),
  );
  const newRecurring = recurring.filter(
    (r) => !existingKeys.has(`${r.note}::${r.amount}`),
  );

  if (newRecurring.length > 0) {
    const { error: insRecErr } = await admin.from('recurring_transactions').insert(
      newRecurring.map((r) => ({
        user_id: user.id,
        account_id: account.id,
        category_id: r.category_id,
        type: 'expense',
        amount: r.amount,
        frequency: r.frequency,
        interval_days: r.interval_days,
        start_date: r.start_date,
        next_run_at: r.next_run_at,
        note: r.note,
        is_active: true,
      })),
    );
    if (insRecErr) throw insRecErr;
    console.log(`✓ Inserted ${newRecurring.length} new recurring rules`);
  } else {
    console.log('✓ All 4 recurring rules already exist');
  }

  console.log('\n=== Seed complete ===');
  console.log('Categories:', categories.map((c) => c.name).join(', '));
  console.log('Recurring: 4 rules');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
