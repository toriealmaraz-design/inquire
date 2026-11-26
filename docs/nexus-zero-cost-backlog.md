# Nexus zero-cost feature backlog

> **Standing reminder:** `DATABASE_URL` in `.env.local` still points to the old Supabase project `yesqrcbyuktcuneasyzu` while `NEXT_PUBLIC_SUPABASE_URL` points to `zgpesfucwvhupbcqdvky`. Replace it with the current session-pooler connection string before verifying DB-backed work. Never put the credential in chat or repo files.

All items are intended to run on the existing React/Next.js + Supabase/Postgres + Vercel + R2-style file storage stack at zero additional cost.

## 1. Client intake & conversion

1. Repeat-client auto-fill from `localStorage` (name, WhatsApp, university/department).
2. Rush-hour surcharge for `< 6h` windows + `10%` early-bird badge for `72h+` submissions.
3. Interactive deliverable checklist (source code, README, APA/IEEE references, speaker notes).
4. Collapsible “Proof & Samples” vault with anonymized screenshots.
5. One-tap 5-star rating + one-sentence testimonial capture on `DELIVERED` tracking links.
6. Multi-file manifest previewer before upload, with missing-rubric/dataset warnings.

## 2. Campus agent growth & retention

7. Client-side canvas QR poster generator with `?ref=CODE` deep link.
8. Pending-clearance vs. available-for-withdrawal earnings counters.
9. Weekly streak tracker with `+2%` commission boost badge.
10. Two-tier sub-agent invite tree with `2%` override for 10+ completed referrals.
11. Course-specific promo presets (`?ref=CODE&cat=code|slides|...`).
12. Payout history and digital receipt log (date, GHS amount, MoMo reference, status).

## 3. Admin command center

13. One-click stripped specialist brief packet (ticket ID, deliverables, deadline, R2 links only).
14. Margin & split simulator before custom quote approval.
15. Ticket aging badges: green `>24h`, amber `<12h`, pulsing purple/red `<3h`.
16. `flagged_contacts` table for spam/ghosting/promo-abuse phone flags.
17. Weekly revenue & conversion funnel snapshot from SQL aggregations.

## 4. Infrastructure & security guardrails

18. Honeypot field + `>3s` minimum submission time on intake and agent registration.
19. Presigned upload/download URLs with `900s` TTL.
20. `navigator.onLine` status banner + `localStorage` offline edit queue with auto-sync.

## Implementation status (26 Nov 2026)

- **Shipped:** 1–9, 11–15, 17–18, 20.
- **Shipped but needs `supabase_setup.sql` re-run:** 16 (`flagged_contacts` table). The API returns an empty list with a warning until the table exists.
- **Pending:** 10 (two-tier sub-agent override needs new DB columns/tables), 19 (presigned 900s URLs need an R2/private-bucket migration; current app uses public Supabase Storage).
- **Added dependency:** `qrcode` for real scannable referral posters.
