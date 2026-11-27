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
- Feature 19 is implemented: `/api/storage/upload` issues 900s presigned R2 PUT tickets, `/api/storage/file?key=...` redirects to a fresh 900s signed GET, and all browser uploads use one helper with a Supabase fallback. `site-assets` (logo/favicon) is never expired by cleanup.

## Pending

- Add a storage-usage dashboard once R2 credentials exist; until then, watch the provider dashboards manually.
- `DATABASE_URL` now points at the `eu-west-1` session pooler for `zgpesfucwvhupbcqdvky`; connectivity and the new schema were verified on 27 Nov 2026. The direct `db.….supabase.co:5432` host is unreachable from this environment, so use the pooler.

## Storage environment variables (Vercel → Project Settings → Environment Variables)

No values are stored in the repository. All variables are server-side; none use the `NEXT_PUBLIC_` prefix.

| Name | Required for | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | fallback + app auth | Public Supabase project URL and anon key (existing setup) |
| `R2_ACCOUNT_ID` | R2 mode | Cloudflare account ID used to build the S3 endpoint |
| `R2_ACCESS_KEY_ID` | R2 mode | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 mode | R2 API token secret |
| `R2_BUCKET` | R2 mode | Private bucket name (e.g. `nexus-files`) |
| `CRON_SECRET` | cleanup | Bearer token expected by `/api/cron/cleanup` when set |

R2 mode turns on only when **all four** `R2_*` variables are present. With any of them missing, `/api/storage/upload` returns a Supabase ticket and the app behaves exactly as before, so local development needs no Cloudflare setup.

## R2 setup notes

- Create a private R2 bucket and an API token scoped to **Object Read & Write** for that bucket; add the four `R2_*` variables above in Vercel (Production/Preview as needed) and redeploy.
- Add a bucket CORS policy allowing the app origin(s) for `PUT` and `GET`, with `content-type` in `AllowedHeaders`. Presigned PUTs send `Content-Type` as a signed header, so the browser must be allowed to send it.
- Use the S3 API endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`, path-style disabled. No public R2 domain or custom domain is needed: links are stored as `/api/storage/file?key=...` and redirect to a fresh 900s signed GET on every request.
- `POST /api/storage/upload` validates name/MIME/size (15 MB max) and restricts `site-assets` tickets to signed-in staff; `uploads` stays public for client briefs.
- `POST /api/storage/delete` is staff-only; admin deletion calls it with R2 keys parsed from `submissions.fileUrls`/`uploads.fileUrl`.
- The weekly Vercel cron hits `/api/cron/cleanup` (`0 3 * * 0`). Retention comes from `settings.fileRetentionDays` (default 7). In R2 mode it scans at most 500 `uploads/` objects using paginated `ListObjectsV2`, deletes expired keys and removes matching DB rows; `site-assets/` and the Supabase path are unchanged.
- Do not add R2 credentials to `.env.example`, docs values, or client code — the AWS SDK is imported lazily on the server only when R2 is configured.
