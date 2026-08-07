# Privacy Policy

> Version 1.0 — Effective 2026-08-04

This Privacy Policy explains how Personal Finance Manager (PFM) collects, uses, stores and protects your personal data in compliance with Vietnamese Decree 13/2023/ND-CP on Personal Data Protection (PDPD).

## 1. Data Controller

The data controller is the individual/office operating PFM. Contact via the email published on the homepage.

## 2. Data We Collect

PFM processes the following **personal data** categories:

- **Identity data**: username, email address
- **Financial data** (sensitive personal data under Article 2 Clause 5 PDPD):
  - Income/expense transactions (amount, category, account, notes, date)
  - Financial accounts (name, currency, balance)
  - Spending categories
  - Recurring budgets
  - Recurring transactions

## 3. Purpose of Processing

Your data is used **only** for:

- Providing personal finance management features
- Generating reports and charts you request
- Synchronization across devices when you log in

We **do not** use your data for advertising, behavioral analytics, or share it with third parties.

## 4. Legal Basis

Processing is based on your **consent** (Article 9 PDPD). You may withdraw consent by deleting your account.

## 5. Retention Period

Data is retained until you **request account deletion**. Within 30 days after deletion, you may log back in to restore. After 30 days, data is permanently deleted.

## 6. Your Rights

Under Article 14 PDPD, you have the right to:

- **Access**: view your data inside the app
- **Rectification**: edit transactions, categories, accounts
- **Erasure**: request account deletion
- **Data portability**: download complete JSON in **Settings → Export Data**
- **Lodge a complaint**: file complaints with the competent authority

## 7. Security

- Passwords hashed with **bcrypt** (via Supabase Auth)
- **HTTPS** enforced for all connections
- Row Level Security (RLS) blocks any cross-user access
- Session JWT stored in httpOnly cookies
- Use strong passwords and enable two-factor authentication if your email provider supports it

## 8. Policy Changes

Any policy change is announced via email and requires your renewed consent. The previous version is preserved in your consent record (`consent_records`).

## 9. Contact

Send any privacy questions to the email published on the homepage.