# Free-tier quota guardrails

## Limits

| Service | Free allowance | Guardrail in this app |
| --- | --- | --- |
| Neon / Supabase Postgres | 1 GB storage, 100 CU-hours per project | Indexed ticket lookups, no server-side polling loops, bounded API limits, retention cleanup |
| Cloudflare R2 | 10 GB storage, 1M Class A writes, 10M Class B reads / month | 15 MB per-file intake cap, manifest previews before upload, old attachment cleanup |

## Current implementation

- Intake uploads are capped at **15 MB per file** in `app/intake/provider.tsx`; the manifest warns before anything is sent.
- `app/api/cron/cleanup/route.ts` plus `vercel.json` remove stale files on a schedule instead of running a compute-heavy worker.
- Ticket and admin queries use `LIMIT` and indexed columns (`ticket_id`, `id`, timestamps).
- The deadline badge ticks client-side only; it does not query Postgres on an interval.

## Pending

- Presigned **900s** upload/download URLs require migrating from public Supabase Storage to private Cloudflare R2 with signed API routes.
- Add a storage-usage dashboard once R2 credentials exist; until then, watch the provider dashboards manually.
- `DATABASE_URL` must be restored before any DB-backed quota check can be verified.
