/**
 * Seed script — split Momo account into 3 sub-wallets + 2 daily recurring rules.
 *
 * Steps:
 *  1. Archive existing "Momo" account (soft-delete).
 *  2. Insert 3 sub-accounts: Túi thần tài (5,638,976đ), Quỹ (9,552,813đ), CVS đầu tư (200,000đ).
 *  3. Insert 2 daily recurring rules: every_n_days interval=1, type=income.
 *     Compound interest (4%/year) sẽ được refresh mỗi lần generateFromRecurring
 *     chạy — xem File 3 trong phase-02-implement.md.
 *
 * Idempotent: chạy lại nhiều lần OK (match theo name + amount).
 *
 * Usage: node --env-file=.env scripts/seed-momo-subwallets.mjs <user_email>
 *
 * Lưu ý:
 *  - Initial_balance khớp với current_balance (trigger không auto-set).
 *  - Không sinh transaction đầu — recurring sẽ tự sinh từ next_run_at = today.
 *  - service-role key bypass RLS → bypass auth check của createRecurring.
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2] || 'sonvo1611@gmail.com';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Sub-accounts theo brainstorm: tách Momo thành 3 khoản nhỏ với rule khác nhau.
const SUB_ACCOUNTS = [
  {
    name: 'Momo - Túi thần tài',
    balance: 5638976,
    type: 'e_wallet',
    icon_name: 'Sparkles',
    color: '#facc15',
  },
  {
    name: 'Momo - Quỹ',
    balance: 9552813,
    type: 'e_wallet',
    icon_name: 'PiggyBank',
    color: '#a3e635',
  },
  {
    name: 'Momo - CVS đầu tư',
    balance: 200000,
    type: 'e_wallet',
    icon_name: 'TrendingUp',
    color: '#22d3ee',
  },
];

// Recurring rules: compound interest 4%/năm daily.
// amount ở đây = lãi ngày 1 (Math.round(initial × 0.04 / 365)).
// generateFromRecurring sẽ refresh amount theo balance hiện tại trước khi insert
// transaction → compound chuẩn MoMo (xem src/features/recurring/actions.ts).
// Note suffix "(4%/năm)" là marker để hook nhận diện.
const RECURRING_RULES = [
  {
    accountName: 'Momo - Túi thần tài',
    amount: 618,
    note: 'Lãi Túi thần tài (4%/năm)',
  },
  {
    accountName: 'Momo - Quỹ',
    amount: 1047,
    note: 'Lãi Quỹ tiết kiệm (4%/năm)',
  },
];

async function main() {
  // 1. Lookup user
  const { data: userList, error: userErr } = await admin.auth.admin.listUsers();
  if (userErr) throw userErr;
  const user = userList.users.find((u) => u.email === email);
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  console.log(`✓ User: ${user.email} (${user.id})`);

  // 2. Archive Momo gốc (idempotent — chỉ archive khi còn active)
  const { data: momoRows, error: momoErr } = await admin
    .from('accounts')
    .select('id, current_balance, is_archived')
    .eq('user_id', user.id)
    .eq('name', 'Momo');
  if (momoErr) throw momoErr;

  const activeMomo = momoRows?.find((a) => !a.is_archived);
  if (activeMomo) {
    const { error: archiveErr } = await admin
      .from('accounts')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', activeMomo.id)
      .eq('user_id', user.id);
    if (archiveErr) throw archiveErr;
    console.log(`✓ Archived Momo (id=${activeMomo.id}, balance was ${activeMomo.current_balance})`);
  } else {
    console.log('✓ Momo already archived (or never existed) — skip');
  }

  // 3. Insert 3 sub-accounts (idempotent theo name + user_id)
  for (const sub of SUB_ACCOUNTS) {
    const { data: existing } = await admin
      .from('accounts')
      .select('id, initial_balance, current_balance')
      .eq('user_id', user.id)
      .eq('name', sub.name)
      .maybeSingle();

    if (existing) {
      console.log(`✓ "${sub.name}" exists (id=${existing.id}, balance=${existing.current_balance}) — skip`);
      continue;
    }

    const { data: inserted, error: insErr } = await admin
      .from('accounts')
      .insert({
        user_id: user.id,
        name: sub.name,
        type: sub.type,
        currency_code: 'VND',
        initial_balance: sub.balance,
        current_balance: sub.balance, // trigger không auto-set cho initial insert
        icon_name: sub.icon_name,
        color: sub.color,
        is_archived: false,
      })
      .select('id')
      .single();
    if (insErr) throw insErr;
    console.log(`✓ Inserted "${sub.name}" (id=${inserted.id}, balance=${sub.balance})`);
  }

  // 4. Insert 2 recurring rules (idempotent theo note + amount)
  const today = new Date().toISOString().slice(0, 10);
  for (const r of RECURRING_RULES) {
    // Lookup account id theo name
    const { data: acc, error: accErr } = await admin
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', r.accountName)
      .single();
    if (accErr || !acc) {
      console.error(`Account "${r.accountName}" not found — run again after sub-accounts are inserted`);
      process.exit(1);
    }

    // Check rule đã tồn tại chưa
    const { data: existing } = await admin
      .from('recurring_transactions')
      .select('id, amount')
      .eq('user_id', user.id)
      .eq('note', r.note)
      .maybeSingle();

    if (existing) {
      console.log(`✓ Rule "${r.note}" exists (id=${existing.id}, amount=${existing.amount}) — skip`);
      continue;
    }

    const { error: insErr } = await admin.from('recurring_transactions').insert({
      user_id: user.id,
      account_id: acc.id,
      category_id: null,
      type: 'income',
      amount: r.amount,
      frequency: 'every_n_days',
      interval_days: 1,
      start_date: today,
      next_run_at: today, // generate từ hôm nay
      is_active: true,
      note: r.note,
    });
    if (insErr) throw insErr;
    console.log(`✓ Inserted rule "${r.note}" (account=${r.accountName}, amount=${r.amount}/day)`);
  }

  console.log('\n=== Seed complete ===');
  console.log('Momo archived; 3 sub-accounts + 2 recurring rules active.');
  console.log('Total across subs:', SUB_ACCOUNTS.reduce((s, a) => s + a.balance, 0).toLocaleString('vi-VN'), 'đ');
  console.log('  Túi  5,638,976đ + lãi 618đ/ngày (4%/năm compound)');
  console.log('  Quỹ  9,552,813đ + lãi 1,047đ/ngày (4%/năm compound)');
  console.log('  CVS    200,000đ (fixed, user update manual)');
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});