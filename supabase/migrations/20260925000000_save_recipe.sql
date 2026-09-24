-- Save a recipe with its ingredients and steps in one transaction.
-- Runs as the caller (security invoker), so row-level security still applies:
-- only the author can edit, and only admins can publish.

create function public.save_recipe(
  p_id          uuid,   -- null to create
  p_recipe      jsonb,  -- { title, slug, intro, photo_url, prep_min, cook_min, servings, tags, is_public }
  p_ingredients jsonb,  -- [{ quantity, unit, name }]
  p_steps       jsonb   -- [text, ...]
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
      author_id, title, slug, intro, photo_url, prep_min, cook_min, servings, tags,
      is_public, published_at
    )
    values (
      auth.uid(),
      p_recipe ->> 'title',
      p_recipe ->> 'slug',
      coalesce(p_recipe ->> 'intro', ''),
      p_recipe ->> 'photo_url',
      (p_recipe ->> 'prep_min')::integer,
      (p_recipe ->> 'cook_min')::integer,
      (p_recipe ->> 'servings')::integer,
      coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}'),
      coalesce((p_recipe ->> 'is_public')::boolean, false),
      case when (p_recipe ->> 'is_public')::boolean then now() end
    )
    returning recipes.id into v_id;
  else
    update public.recipes r set
      title        = p_recipe ->> 'title',
      slug         = p_recipe ->> 'slug',
      intro        = coalesce(p_recipe ->> 'intro', ''),
      photo_url    = p_recipe ->> 'photo_url',
      prep_min     = (p_recipe ->> 'prep_min')::integer,
      cook_min     = (p_recipe ->> 'cook_min')::integer,
      servings     = (p_recipe ->> 'servings')::integer,
      tags         = coalesce(array(select jsonb_array_elements_text(p_recipe -> 'tags')), '{}'),
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

revoke execute on function public.save_recipe(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_recipe(uuid, jsonb, jsonb, jsonb) to authenticated;

-- Photo uploads: images only, 5 MB max.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'recipe-photos';
