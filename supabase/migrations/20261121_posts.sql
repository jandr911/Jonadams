create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  published_on date not null default current_date,
  published boolean not null default false,
  summary text not null default '',
  cover text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "public reads published posts" on public.posts for select using (published or public.is_admin());
create policy "admin writes posts" on public.posts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
