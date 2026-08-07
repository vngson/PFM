# Supabase — Migrations & Seed

## Apply migrations (1 lần khi setup project)

Vào **Supabase Dashboard → SQL Editor → New query**, chạy theo thứ tự:

1. `migrations/0001_init_schema.sql` — tables, RLS, triggers
2. `migrations/0002_seed_default_categories.sql` — helper function

Sau khi 2 file này chạy xong, `public.transactions`, `accounts`, `categories`, `budgets`, … đã sẵn.

## Seed dữ liệu demo

`seed.sql` chèn:
- 1 user demo (`demo@example.com`, password `DemoPassword123!`)
- 1 profile cho user đó
- 3 accounts: Ví tiền mặt / MoMo / Vietcombank
- 16 categories mặc định (tiếng Việt)
- 36 transactions trải 3 tháng (06-08/2026) gồm income, expense, transfer

**Chạy**:

```text
Supabase Dashboard → SQL Editor → New query → paste seed.sql → Run
```

Verify output sẽ là:

```
   table       | count
  profiles     |     1
  accounts     |     3
  categories   |    16
  transactions |    36
  txns_income  |     6
  txns_expense |    25
  txns_transfer|     5
```

Sau đó login web bằng `demo@example.com` / `DemoPassword123!` để xem data thật.

## Reset / chạy lại

`seed.sql` idempotent cho accounts/categories/transactions (xóa rồi chèn lại). Có thể chạy nhiều lần không sinh duplicate.

**Lưu ý**: trigger `trg_transactions_balance` tự cập nhật `accounts.current_balance` mỗi khi insert transaction. Vì seed xóa accounts trước → chèn accounts với `current_balance` thủ công (đúng số dư ban đầu) → sau đó insert transactions → trigger sẽ cộng/trừ trên `current_balance` mới → kết quả cuối = số dư sau tất cả transactions. Có thể verify bằng:

```sql
select name, current_balance
from public.accounts
where user_id = '00000000-0000-0000-0000-000000000001'
order by name;
```

## Troubleshooting

### "permission denied for table users"
Bạn không có quyền INSERT vào `auth.users` (chỉ GoTrue service mới có). Có 2 cách:

**A. Tạo user qua Dashboard → Authentication → Users → Add user** (email + password).
Sau đó sửa `demo_id` trong `seed.sql` thành UUID thật của user vừa tạo.
Có thể lấy id bằng SQL: `select id, email from auth.users;`.

**B. Dùng service_role key** để gọi Admin API create user:
```bash
curl -X POST 'https://<project>.supabase.co/auth/v1/admin/users' \
  -H "apikey: <service_role_key>" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"DemoPassword123!","email_confirm":true}'
```
Rồi lấy id từ response, thay vào seed.sql.

### "column profiles.username violates not-null"
Có thể trigger `on_auth_user_created` đã tự tạo profile rồi. Insert on conflict sẽ skip.

### Tổng số dư không khớp
Verify trigger còn hoạt động:
```sql
select tgname, tgenabled from pg_trigger
where tgrelid = 'public.transactions'::regclass;
```
Nếu `tgenabled = 'D'` → trigger bị disable, chạy lại `migrations/0001_init_schema.sql`.
