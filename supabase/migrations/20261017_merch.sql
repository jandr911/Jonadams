create table public.merch (
  id uuid primary key default gen_random_uuid(),
  position integer not null default 0,
  name text not null default '',
  kind text not null default 'tee' check (kind in ('tee', 'hoodie', 'joggers', 'other')),
  price text not null default '',
  note text not null default '',
  photo text not null default '',
  sizes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.merch enable row level security;

create policy "public reads merch" on public.merch for select using (true);
create policy "admin writes merch" on public.merch for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
