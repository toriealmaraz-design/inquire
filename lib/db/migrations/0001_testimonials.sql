-- Public customer feedback / testimonials. Anyone can submit; admins moderate.
-- status: 'pending' (awaiting review) | 'approved' (shown publicly) | 'hidden'
create table if not exists testimonials (
  id         serial primary key,
  name       varchar(120) not null,
  role       varchar(120),
  rating     integer not null default 5,
  body       text not null,
  status     varchar(20) not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists testimonials_status_idx on testimonials (status, created_at desc);
