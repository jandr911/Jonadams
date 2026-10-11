create table public.admins (
  email text primary key
);

create table public.site_copy (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('listen', 'watch')),
  position integer not null default 0,
  title text not null default '',
  youtube_id text not null default '',
  kind text not null default 'video' check (kind in ('single', 'release', 'live', 'video')),
  created_at timestamptz not null default now()
);

create table public.creatives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default '',
  craft text not null default '',
  city text not null default '',
  bio text not null default '',
  photo text not null default '',
  youtube text not null default '',
  links jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  href text not null default '',
  position integer not null default 0
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where email = (auth.jwt() ->> 'email')
  );
$$;

alter table public.admins enable row level security;
alter table public.site_copy enable row level security;
alter table public.videos enable row level security;
alter table public.creatives enable row level security;
alter table public.links enable row level security;

create policy "admins read own row" on public.admins
  for select to authenticated using (email = (auth.jwt() ->> 'email'));

create policy "public reads copy" on public.site_copy for select using (true);
create policy "admin writes copy" on public.site_copy for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads videos" on public.videos for select using (true);
create policy "admin writes videos" on public.videos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads creatives" on public.creatives for select using (true);
create policy "admin writes creatives" on public.creatives for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "public reads links" on public.links for select using (true);
create policy "admin writes links" on public.links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav']);

create policy "public reads media" on storage.objects
  for select using (bucket_id = 'media');
create policy "admin uploads media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admin updates media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admin deletes media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());

insert into public.admins (email) values ('jonadams.coo@gmail.com');

insert into public.videos (room, position, title, kind) values
  ('listen', 0, 'Lead single', 'single'),
  ('listen', 1, 'Latest release', 'release'),
  ('listen', 2, 'Live session', 'live'),
  ('listen', 3, 'Fan favorite', 'release'),
  ('watch', 0, 'Official video', 'video'),
  ('watch', 1, 'Behind the scenes', 'video');

insert into public.links (label, position) values
  ('Instagram', 0),
  ('YouTube', 1),
  ('Spotify', 2),
  ('Apple Music', 3),
  ('TikTok', 4);
