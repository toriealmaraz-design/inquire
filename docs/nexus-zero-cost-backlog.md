# Nexus zero-cost feature backlog

> **Database status (resolved 27 Nov 2026):** `.env.local` now uses the `eu-west-1` session pooler for `zgpesfucwvhupbcqdvky`. The file is gitignored — never commit credentials or paste them into repo files. Rotate any secret that has appeared in chat.

All items are intended to run on the existing React/Next.js + Supabase/Postgres + Vercel + R2-style file storage stack at zero additional cost.

## 1. Client intake & conversion

1. Repeat-client auto-fill from `localStorage` (name, WhatsApp, university/department).
2. Rush-hour surcharge for windows under 6 hours and a `10%` early-bird badge for submissions made more than 72 hours ahead.
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
15. Ticket aging badges: green over 1 day, amber under 12 hours, pulsing purple and red under 3 hours.
16. `flagged_contacts` table for spam/ghosting/promo-abuse phone flags.
17. Weekly revenue & conversion funnel snapshot from SQL aggregations.

## 4. Infrastructure & security guardrails

18. Honeypot field and a minimum submission time of over 3 seconds on intake and agent registration.
19. Presigned upload and download URLs with a time to live of 900 seconds.
20. `navigator.onLine` status banner + `localStorage` offline edit queue with auto-sync.

## Implementation status (27 Nov 2026)

- **Shipped:** 1–20 (19 uses R2 when configured, Supabase otherwise).
- **Schema verified live:** `flagged_contacts`, `parent_agent_id`, `upline_agent_id`, `revision_count`, `client_signoff_at`, `commission_status`, `override_ghs`, all three new constraints and all five lookup indexes are present in the connected Supabase project.
- **Shipped with fallback:** 19 (900-second presigned R2 PUT and GET via `/api/storage/*`; with no `R2_*` variables the app keeps using public Supabase Storage unchanged).
- **Added dependency:** `qrcode` for real scannable referral posters.

## Operations and quality pass (27 Nov 2026)

- **Sanitized specialist packets** remove client phone numbers, email addresses, agent referral codes and labels, upline identifiers and commission amounts. Deadlines, technical specifications, attachment links and the specialist support boundary are retained.
- **Pre-delivery quality assurance** requires four checks (requirements matched, files verified, formatting and code runnable, no broken links) plus an internal sign-off before a ticket can become Delivered, Completed or Paid. Progress and an optional handoff note can be saved without changing status.
- **Quote guardrail** rejects a quote unless the specialist fee, direct agent cut and sub-agent override leave a positive platform margin of at least 15 percent of the quote. Computed figures are returned in the error; nothing is silently clamped.
- **Stale follow-up flags** are computed on each submissions read for tickets waiting more than two days for quote approval or more than one day since the last specialist update. The admin dashboard offers a copy-ready follow-up note. No server polling is involved.
- **Handoff summary and standards** provide a printable delivery summary and state the two-round revision limit and the two-hour internal quality assurance buffer.
- **Database status:** the new nullable columns are added to both the Drizzle schema and `supabase_setup.sql`. Runtime verification remains pending because the current database password fails with `28P01`; no sample or fabricated data has been added.

## Refined scope (26 Nov 2026, second pass)

- **Sub-agent network:** `?upline=CODE` invite links, self-referential `parent_agent_id`, depth cap 2, anti-loop checks, anonymized roster, `15%` of platform net margin as override (never from specialist/direct-agent cuts), released only after `DELIVERED` + paid + client sign-off.
- **Client:** 4 quick-scope presets layered onto the existing dedicated intake steps, urgency chips, no-login ticket timeline with revision count (0–2), WhatsApp handoff to `0206478727`, explicit client sign-off before `PENDING → AVAILABLE`.
- **Admin:** split simulator extended with sub-agent override, manual MoMo batch CSV, deadline sorting by remaining hours, file-size caps and retention cleanup.
- **Quota guardrails:** Neon free plan = 1 GB and 100 compute-unit hours; R2 free plan = 10 GB, 1 million Class A operations and 10 million Class B operations per month. Prefer indexed lookups, no server polling loops, a 15 MB per-file intake cap, automated retention cleanup. R2 is wired behind four server-only environment variables; until they are set, storage stays on public Supabase Storage.
- **Verification (27 Nov 2026):** `tsc --noEmit`, `next build`, and headless-Chrome checks passed for `/`, `/intake`, `/track`, `/chat`, `/auth/signin`, `/dashboard`, `/agent/dashboard` with zero exceptions and zero server DB errors. Direct Postgres host was unreachable from this environment, so the session pooler is used. Live checks: `select 1` OK, `/api/testimonials` 200, `/api/chatbot` 200, `/api/ticket?id=…` 200 with revision/sign-off fields, protected APIs 403 unauthenticated. Authenticated dashboards redirect to sign-in as expected without a session.
