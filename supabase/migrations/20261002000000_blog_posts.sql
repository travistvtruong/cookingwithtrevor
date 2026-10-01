-- Blog posts (Phase 2): general articles alongside recipes and reviews.
-- A new table rather than a new recipes.kind, so no existing table changes.
-- Written by the admin only; readers see published posts.

create table public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt          text not null default '' check (char_length(excerpt) <= 300),
  body             text not null default '' check (char_length(body) <= 50000),
  cover_photo_url  text,
  tags             text[] not null default '{}',
  is_public        boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index blog_posts_public_idx on public.blog_posts (published_at desc) where is_public;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- Set the publish date the first time a post goes public; keep it after that.
create function public.blog_posts_set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_public and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger blog_posts_published_at
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_set_published_at();

alter table public.blog_posts enable row level security;

create policy "read published blog posts, admin reads all" on public.blog_posts
  for select using (is_public or public.is_admin());

create policy "admin writes blog posts" on public.blog_posts
  for insert to authenticated
  with check (public.is_admin() and author_id = (select auth.uid()));

create policy "admin edits blog posts" on public.blog_posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin deletes blog posts" on public.blog_posts
  for delete to authenticated
  using (public.is_admin());

-- Authors can't backdate or rewrite who wrote a post (author_id defaults to
-- the caller; published_at and timestamps are set by triggers).
revoke insert, update on public.blog_posts from authenticated, anon;
grant insert (title, slug, excerpt, body, cover_photo_url, tags, is_public) on public.blog_posts to authenticated;
grant update (title, slug, excerpt, body, cover_photo_url, tags, is_public) on public.blog_posts to authenticated;
