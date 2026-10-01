-- Multiple photos per post: a gallery under the main photo, for recipes,
-- reviews and blog posts. New table only. Admin-written; readers see the
-- photos of published posts.
-- Requires 20261002000000_blog_posts.sql.

create table public.post_photos (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid references public.recipes (id) on delete cascade,
  blog_post_id  uuid references public.blog_posts (id) on delete cascade,
  url           text not null check (char_length(url) <= 500),
  caption       text not null default '' check (char_length(caption) <= 200),
  position      integer not null check (position >= 0),
  created_at    timestamptz not null default now(),
  -- Exactly one parent post.
  check ((recipe_id is null) <> (blog_post_id is null))
);
create index post_photos_recipe_idx on public.post_photos (recipe_id, position) where recipe_id is not null;
create index post_photos_blog_idx on public.post_photos (blog_post_id, position) where blog_post_id is not null;

alter table public.post_photos enable row level security;

-- Visible when the parent post is visible (RLS on recipes/blog_posts applies).
create policy "read photos of visible posts" on public.post_photos
  for select using (
    exists (select 1 from public.recipes r where r.id = recipe_id)
    or exists (select 1 from public.blog_posts b where b.id = blog_post_id)
  );

create policy "admin manages post photos" on public.post_photos
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Replace a post's gallery in one transaction. Returns the URLs that were
-- removed, so the app can delete those files from storage.
create function public.set_post_photos(
  p_recipe_id     uuid,   -- one of these two
  p_blog_post_id  uuid,
  p_photos        jsonb   -- [{ url, caption }] in display order
)
returns table (removed_url text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (p_recipe_id is null) = (p_blog_post_id is null) then
    raise exception 'Pass exactly one of recipe id or blog post id' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_photos, '[]')) > 12 then
    raise exception 'Up to 12 extra photos per post' using errcode = '22023';
  end if;

  return query
    delete from public.post_photos p
    where (p.recipe_id = p_recipe_id or p.blog_post_id = p_blog_post_id)
      and p.url not in (select x ->> 'url' from jsonb_array_elements(coalesce(p_photos, '[]')) x)
    returning p.url;

  delete from public.post_photos p where p.recipe_id = p_recipe_id or p.blog_post_id = p_blog_post_id;

  insert into public.post_photos (recipe_id, blog_post_id, url, caption, position)
  select p_recipe_id, p_blog_post_id, x.item ->> 'url', coalesce(x.item ->> 'caption', ''), (x.ord - 1)::integer
  from jsonb_array_elements(coalesce(p_photos, '[]')) with ordinality as x(item, ord);
end;
$$;

revoke execute on function public.set_post_photos(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_post_photos(uuid, uuid, jsonb) to authenticated;
