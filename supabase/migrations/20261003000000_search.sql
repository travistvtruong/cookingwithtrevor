-- Site search (R19): one parameterized function over published recipes,
-- reviews and blog posts. No table changes or new indexes; for a small blog
-- the text vectors are computed at query time. Runs as the caller, so RLS
-- still limits results to published posts.
-- Requires 20261002000000_blog_posts.sql.

create function public.search_posts(p_query text, p_limit integer default 30)
returns table (
  kind          text,     -- 'recipe' | 'review' | 'blog'
  id            uuid,
  title         text,
  slug          text,
  summary       text,
  photo_url     text,
  place_name    text,
  my_rating     smallint,
  tags          text[],
  published_at  timestamptz,
  rank          real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      websearch_to_tsquery('english', p_query) as tsq,
      -- Literal substring pattern: escape LIKE wildcards in the user's text.
      '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  ),
  hits as (
    select
      r.kind, r.id, r.title, r.slug, r.intro as summary, r.photo_url, r.place_name, r.my_rating, r.tags,
      r.published_at,
      ts_rank(
        to_tsvector('english',
          r.title || ' ' || coalesce(r.place_name, '') || ' ' || coalesce(r.place_location, '') || ' ' ||
          array_to_string(r.tags, ' ') || ' ' || r.intro),
        q.tsq
      ) + case when r.title ilike q.pat then 1 else 0 end as rank
    from public.recipes r, q
    where r.is_public
      and (
        to_tsvector('english',
          r.title || ' ' || coalesce(r.place_name, '') || ' ' || coalesce(r.place_location, '') || ' ' ||
          array_to_string(r.tags, ' ') || ' ' || r.intro) @@ q.tsq
        or r.title ilike q.pat
        or coalesce(r.place_name, '') ilike q.pat
        or exists (select 1 from unnest(r.tags) t where t ilike q.pat)
        or exists (select 1 from public.ingredients i where i.recipe_id = r.id and i.name ilike q.pat)
      )

    union all

    select
      'blog', b.id, b.title, b.slug, b.excerpt, b.cover_photo_url, null, null, b.tags, b.published_at,
      ts_rank(
        to_tsvector('english', b.title || ' ' || b.excerpt || ' ' || array_to_string(b.tags, ' ') || ' ' || b.body),
        q.tsq
      ) + case when b.title ilike q.pat then 1 else 0 end
    from public.blog_posts b, q
    where b.is_public
      and (
        to_tsvector('english', b.title || ' ' || b.excerpt || ' ' || array_to_string(b.tags, ' ') || ' ' || b.body)
          @@ q.tsq
        or b.title ilike q.pat
        or exists (select 1 from unnest(b.tags) t where t ilike q.pat)
      )
  )
  select kind, id, title, slug, summary, photo_url, place_name, my_rating, tags, published_at, rank::real
  from hits
  where char_length(btrim(p_query)) between 2 and 100
  order by rank desc, published_at desc nulls last
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.search_posts(text, integer) to anon, authenticated;
