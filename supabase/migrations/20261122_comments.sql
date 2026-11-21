create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now()
);

create index comments_post_created on public.comments (post_id, created_at);

alter table public.comments enable row level security;

create policy "public reads comments on published posts" on public.comments for select
  using (exists (select 1 from public.posts p where p.id = post_id and (p.published or public.is_admin())));

create policy "anyone comments on published posts" on public.comments for insert to anon, authenticated
  with check (
    body !~* '(https?://|www\.)'
    and name !~* '(https?://|www\.)'
    and exists (select 1 from public.posts p where p.id = post_id and p.published)
  );

create function public.comments_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments c where c.post_id = new.post_id and c.created_at > now() - interval '1 minute') >= 5 then
    raise exception 'comment rate limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit before insert on public.comments
  for each row execute function public.comments_rate_limit();

create policy "admin deletes comments" on public.comments for delete to authenticated
  using (public.is_admin());
