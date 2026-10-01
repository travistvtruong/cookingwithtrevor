-- Food review posts.
-- Reviews share the recipes table (same publishing, photos, URLs, comments,
-- sitemap) with kind = 'review' and a few review-only fields. Existing rows
-- become kind = 'recipe'. Reviews have no ingredients or steps.

alter table public.recipes
  add column kind text not null default 'recipe' check (kind in ('recipe', 'review')),
  add column place_name text check (char_length(place_name) <= 200),
  add column place_location text check (char_length(place_location) <= 200),
  add column my_rating smallint check (my_rating between 1 and 5);

-- A review must say what it reviews and how it rated.
alter table public.recipes
  add constraint recipes_review_fields
  check (kind <> 'review' or (place_name is not null and my_rating is not null));

create index recipes_public_kind_idx on public.recipes (kind, published_at desc) where is_public;

-- Same signature as before (p_recipe is jsonb), now also saving the review fields.
create or replace function public.save_recipe(
  p_id              uuid,     -- null to create
  p_recipe          jsonb,    -- { kind, title, slug, intro, photo_url, prep_min, cook_min, servings, tags, is_public,
                            --   place_name, place_location, my_rating }
  p_ingredients     jsonb,    -- [{ quantity, unit, name }]
  p_steps           jsonb,    -- [text, ...]
  p_add_to_library  boolean default false  -- on create: also save to the author's library
)
returns table (id uuid, slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_id is null then
    insert into public.recipes (
      author_id, kind, title, slug, intro, photo_url, prep_min, cook_min, servings, tags,
      place_name, place_location, my_rating, is_public, published_at
    )
    values (
      auth.uid(),
      coalesce(p_recipe ->> 'kind', 'recipe'),
      p_recipe ->> 'title',
      p_recipe ->> 'slug',
      coalesce(p_recipe ->> 'intro', ''),
      p_recipe ->> 'photo_url',
      (p_recipe ->> 'prep_min')::integer,
      (p_recipe ->> 'cook_min')::integer,
      (p_recipe ->> 'servings')::integer,
      coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}'),
      p_recipe ->> 'place_name',
      p_recipe ->> 'place_location',
      (p_recipe ->> 'my_rating')::smallint,
      coalesce((p_recipe ->> 'is_public')::boolean, false),
      case when (p_recipe ->> 'is_public')::boolean then now() end
    )
    returning recipes.id into v_id;

    if p_add_to_library then
      insert into public.saved_recipes (user_id, recipe_id) values (auth.uid(), v_id);
    end if;
  else
    update public.recipes r set
      kind         = coalesce(p_recipe ->> 'kind', 'recipe'),
      title        = p_recipe ->> 'title',
      slug         = p_recipe ->> 'slug',
      intro        = coalesce(p_recipe ->> 'intro', ''),
      photo_url    = p_recipe ->> 'photo_url',
      prep_min     = (p_recipe ->> 'prep_min')::integer,
      cook_min     = (p_recipe ->> 'cook_min')::integer,
      servings     = (p_recipe ->> 'servings')::integer,
      tags         = coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}'),
      place_name     = p_recipe ->> 'place_name',
      place_location = p_recipe ->> 'place_location',
      my_rating      = (p_recipe ->> 'my_rating')::smallint,
      is_public    = coalesce((p_recipe ->> 'is_public')::boolean, false),
      -- Keep the original publish date; set it the first time a post goes public.
      published_at = case
        when (p_recipe ->> 'is_public')::boolean then coalesce(r.published_at, now())
        else r.published_at
      end
    where r.id = p_id
    returning r.id into v_id;

    if v_id is null then
      raise exception 'Recipe not found' using errcode = 'P0002';
    end if;

    delete from public.ingredients where recipe_id = v_id;
    delete from public.steps where recipe_id = v_id;
  end if;

  insert into public.ingredients (recipe_id, position, quantity, unit, name)
  select v_id, i.ord::integer, (i.item ->> 'quantity')::numeric, i.item ->> 'unit', i.item ->> 'name'
  from jsonb_array_elements(p_ingredients) with ordinality as i(item, ord);

  insert into public.steps (recipe_id, position, text)
  select v_id, s.ord::integer, s.item
  from jsonb_array_elements_text(p_steps) with ordinality as s(item, ord);

  return query select r.id, r.slug from public.recipes r where r.id = v_id;
end;
$$;
