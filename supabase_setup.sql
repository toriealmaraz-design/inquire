-- ============================================================================
-- Gemini Nexus (inquire) — full database setup for a FRESH Supabase project.
-- Run this in the Supabase Dashboard -> SQL Editor (one shot). Idempotent: safe
-- to re-run. It recreates everything the app expects that is NOT in the repo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables (mirror of lib/db/schema.ts)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id serial primary key,
  auth_id varchar(255) not null unique,
  email varchar(255) not null unique,
  name varchar(255) not null,
  avatar text,
  role varchar(50),
  status varchar(20) not null default 'active',
  field varchar(30),
  referral_code varchar(20) unique,
  profile jsonb,
  onboarded_at timestamp,
  signup_notified boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.settings (
  id integer primary key default 1,
  whatsapp_number varchar(20) default '233206478727',
  telegram_username varchar(50) default 'GeminiNexusAdmin',
  instagram_username varchar(50) default 'GeminiNexusAdmin',
  snapchat_username varchar(50) default 'GeminiNexus',
  contact_email varchar(120),
  telegram_bot_token text default '',
  telegram_chat_id varchar(50) default '',
  file_retention_days integer not null default 7,
  chat_greeting text,
  chat_away_message text,
  visit_alert_at timestamptz,
  auto_reply_enabled boolean not null default true,
  commission_percent numeric(5,2) default '10',
  vapid_public_key text,
  vapid_private_key text,
  logo_url text,
  favicon_url text,
  updated_at timestamp default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.conversations (
  id serial primary key,
  client_name varchar(255) not null,
  client_email varchar(255),
  status varchar(20) default 'active',
  assigned_to integer references public.users(id),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.messages (
  id serial primary key,
  conversation_id integer references public.conversations(id),
  sender_type varchar(20) not null,
  sender_id integer references public.users(id),
  content text not null,
  read boolean default false,
  -- WhatsApp-style extras (schema drift — added live, not in schema.ts):
  reply_to integer,
  edited_at timestamptz,
  deleted_at timestamptz,
  reactions jsonb,
  created_at timestamp not null default now()
);

create table if not exists public.uploads (
  id serial primary key,
  conversation_id integer references public.conversations(id),
  file_name varchar(255) not null,
  file_url text not null,
  file_type varchar(100),
  file_size integer,
  uploaded_by varchar(20) not null,
  user_id integer references public.users(id),
  created_at timestamp not null default now()
);

create table if not exists public.submissions (
  id serial primary key,
  ticket_id varchar(20) not null unique,
  category varchar(50) not null,
  service_type varchar(100) not null,
  title varchar(120),
  scope varchar(50),
  urgency varchar(50),
  client_contact varchar(50),
  brief_details text,
  file_urls text,
  status varchar(30) default 'Pending Quote',
  assigned_to integer references public.users(id),
  referred_by integer references public.users(id),
  price_ghs numeric(10,2),
  commission_ghs numeric(10,2),
  referral_commission_ghs numeric(10,2),
  assigned_at timestamp,
  paid_at timestamp,
  created_at timestamp default now()
);

create table if not exists public.announcements (
  id serial primary key,
  title varchar(120) not null,
  body text not null,
  field varchar(30),
  created_by integer references public.users(id),
  created_at timestamp not null default now()
);

create table if not exists public.push_subscriptions (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamp not null default now()
);

create table if not exists public.staff_accounts (
  id serial primary key,
  full_name varchar(120) not null,
  email varchar(160) not null unique,
  role varchar(60) not null,
  password_hash varchar(255) not null,
  must_change_password boolean not null default true,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists public.chatbot_replies (
  id serial primary key,
  question varchar(120) not null,
  keywords text not null,
  reply text not null,
  sort integer not null default 0,
  enabled boolean not null default true,
  created_at timestamp not null default now()
);

create table if not exists public.chatbot_misses (
  id serial primary key,
  question varchar(300) not null unique,
  hits integer not null default 1,
  last_at timestamp not null default now()
);

create table if not exists public.notifications (
  id serial primary key,
  user_id integer not null references public.users(id) on delete cascade,
  title varchar(160) not null,
  body text,
  url varchar(300),
  tag varchar(80),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id serial primary key,
  user_id integer references public.users(id) on delete set null,
  category varchar(40) not null default 'Other',
  subject varchar(150) not null,
  body text not null,
  anonymous boolean not null default false,
  status varchar(20) not null default 'Open',
  response text,
  responded_by integer references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id serial primary key,
  name varchar(120) not null,
  role varchar(120),
  rating integer not null default 5,
  body text not null,
  status varchar(20) not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Ticket-number generator: AC-2610-001 (academic), MD-… (media), IT-… (systems)
--    Sequence is per (prefix, YYMM). Not stored in the repo — reconstructed here.
-- ---------------------------------------------------------------------------
create table if not exists public.ticket_counters (
  prefix text not null,
  period text not null,
  n integer not null default 0,
  primary key (prefix, period)
);

create or replace function public.next_ticket_id(cat text)
returns text language plpgsql as $$
declare pfx text; per text; seq integer;
begin
  pfx := case lower(cat)
            when 'academic' then 'AC'
            when 'media'    then 'MD'
            when 'systems'  then 'IT'
            else 'GN' end;
  per := to_char(now(), 'YYMM');
  insert into public.ticket_counters (prefix, period, n) values (pfx, per, 1)
    on conflict (prefix, period) do update set n = public.ticket_counters.n + 1
    returning n into seq;
  return pfx || '-' || per || '-' || lpad(seq::text, 3, '0');
end $$;

-- ---------------------------------------------------------------------------
-- 3. Realtime: live chat + dashboards subscribe to changes on these tables
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.uploads;

-- ---------------------------------------------------------------------------
-- 4. Storage buckets + policies
--    'uploads'     : brief & chat file attachments (clients upload via anon key).
--    'site-assets' : logo/favicon (super-admin AssetManager).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
  on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('site-assets', 'site-assets', true)
  on conflict (id) do update set public = true;

-- uploads: public read; anon + authenticated may upload / change / remove their files
drop policy if exists "uploads public read"   on storage.objects;
drop policy if exists "uploads write insert"   on storage.objects;
drop policy if exists "uploads write update"   on storage.objects;
drop policy if exists "uploads write delete"   on storage.objects;
create policy "uploads public read" on storage.objects
  for select using (bucket_id = 'uploads');
create policy "uploads write insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'uploads');
create policy "uploads write update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'uploads');
create policy "uploads write delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'uploads');

drop policy if exists "site-assets public read" on storage.objects;
drop policy if exists "site-assets auth insert"  on storage.objects;
drop policy if exists "site-assets auth update"  on storage.objects;
drop policy if exists "site-assets auth delete"  on storage.objects;
create policy "site-assets public read" on storage.objects
  for select using (bucket_id = 'site-assets');
create policy "site-assets auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-assets');
create policy "site-assets auth update" on storage.objects
  for update to authenticated using (bucket_id = 'site-assets');
create policy "site-assets auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'site-assets');

-- ---------------------------------------------------------------------------
-- 5. Role privileges — the browser (anon key) inserts/selects messages,
--    conversations and uploads directly via supabase-js, so grant access.
--    (Server routes use DATABASE_URL as postgres and bypass this.)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- Disable RLS on the app tables. The browser uses the anon key to read/write chat
-- messages, conversations and uploads directly; server routes use DATABASE_URL
-- (postgres) and bypass RLS. If a prior tool enabled RLS, this turns it back off.
do $$
declare t text;
begin
  foreach t in array array[
    'users','settings','conversations','messages','uploads','submissions',
    'announcements','push_subscriptions','staff_accounts','chatbot_replies',
    'chatbot_misses','notifications','complaints','testimonials','ticket_counters'
  ] loop
    execute format('alter table if exists public.%I disable row level security', t);
  end loop;
end $$;

-- Make sure the single settings row exists (branding, VAPID keys, commission %, etc.)
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ============================================================================
-- Done. The first user to sign in with the Google account matching
-- SUPER_ADMIN_EMAIL is promoted to super_admin automatically by the app.
-- ============================================================================
