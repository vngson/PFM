-- =========================================================================
-- 0009_drop_transfer_to_account.sql
-- Cleanup: bỏ cột to_account_id + index, đảm bảo trigger handle income/expense
-- đúng cho approach "transfer = 2 row income + expense".
--
-- Approach chốt (transfer giữa 2 account của cùng user):
--   - User tạo transfer qua TransferForm → Server Action insert 2 row vào
--     bảng `transactions`:
--       row 1: account_id = from,  type = 'expense', amount = X
--       row 2: account_id = to,    type = 'income',  amount = X
--   - Cả 2 row có cùng `note` (vd "Chuyển tiền: ..."), cùng occurred_at.
--   - account_id của 2 row khác nhau → account detail page chỉ cần filter
--     `account_id = X` (single FK embed `account:accounts(...)`) là thấy cả
--     2 phía của transfer.
--   - List tổng (/transactions) hiển thị +/- như income/expense thông thường.
--
-- Tại sao cần migration này:
--   - Một số DB (đã từng apply approach cũ với cột to_account_id) cần drop
--     cột + index để về schema sạch, không phụ thuộc column không dùng nữa.
--   - Idempotent (`if exists`) để an toàn trên:
--       * Fresh DB (chưa có cột/index → no-op)
--       * Existing DB (đã có cột/index → drop sạch)
--
-- Trigger `apply_transaction_to_balance`:
--   - Không đổi schema, nhưng CREATE OR REPLACE để đảm bảo function trên DB
--     luôn match phiên bản "1-account" (income cộng, expense trừ). Logic này
--     đã đúng cho approach mới (transfer = 2 row income+expense); nhánh
--     `transfer` (legacy data) giữ để không vỡ backward-compat.
-- =========================================================================

-- 1. Drop index (nếu còn) — drop trước để tránh lỗi khi drop column
drop index if exists public.transactions_user_to_account_idx;

-- 2. Drop cột to_account_id (kèm FK constraint)
alter table public.transactions
  drop column if exists to_account_id;

-- 3. Đảm bảo trigger function ở phiên bản 1-account:
--    - income:   cộng amount vào account_id
--    - expense:  trừ amount từ account_id
--    - transfer (legacy): trừ từ account_id (giống expense) — backward-compat
create or replace function public.apply_transaction_to_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delta numeric(18, 2);
begin
  if (tg_op = 'INSERT') then
    if (new.type = 'income') then
      delta := new.amount;
    elsif (new.type = 'expense') then
      delta := -new.amount;
    elsif (new.type = 'transfer') then
      -- Legacy row transfer (approach cũ 2-row với type='transfer'): trừ
      -- amount từ account_id. Approach mới dùng 2 row income+expense,
      -- không tạo type='transfer' nữa.
      delta := -new.amount;
    else
      return new;
    end if;
    update public.accounts
       set current_balance = current_balance + delta,
           updated_at = now()
     where id = new.account_id
       and user_id = new.user_id;
    return new;

  elsif (tg_op = 'DELETE') then
    if (old.type = 'income') then
      delta := -old.amount;
    elsif (old.type = 'expense') then
      delta := old.amount;
    elsif (old.type = 'transfer') then
      delta := old.amount;
    else
      return old;
    end if;
    update public.accounts
       set current_balance = current_balance + delta,
           updated_at = now()
     where id = old.account_id
       and user_id = old.user_id;
    return old;

  elsif (tg_op = 'UPDATE') then
    if (old.type = 'income') then
      update public.accounts
         set current_balance = current_balance - old.amount,
             updated_at = now()
       where id = old.account_id and user_id = old.user_id;
    elsif (old.type = 'expense') then
      update public.accounts
         set current_balance = current_balance + old.amount,
             updated_at = now()
       where id = old.account_id and user_id = old.user_id;
    elsif (old.type = 'transfer') then
      update public.accounts
         set current_balance = current_balance + old.amount,
             updated_at = now()
       where id = old.account_id and user_id = old.user_id;
    end if;
    if (new.type = 'income') then
      update public.accounts
         set current_balance = current_balance + new.amount,
             updated_at = now()
       where id = new.account_id and user_id = new.user_id;
    elsif (new.type = 'expense') then
      update public.accounts
         set current_balance = current_balance - new.amount,
             updated_at = now()
       where id = new.account_id and user_id = new.user_id;
    elsif (new.type = 'transfer') then
      update public.accounts
         set current_balance = current_balance - new.amount,
             updated_at = now()
       where id = new.account_id and user_id = new.user_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Trigger không cần recreate — đã execute function public.apply_transaction_to_balance().
