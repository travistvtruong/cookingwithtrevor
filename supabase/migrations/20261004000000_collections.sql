-- Collections (R20): users group recipes from their library into named
-- collections ("Weeknight dinners"). New tables only; fully private per user.

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);
create index collections_user_idx on public.collections (user_id, name);

create table public.collection_recipes (
  collection_id  uuid not null references public.collections (id) on delete cascade,
  recipe_id      uuid not null references public.recipes (id) on delete cascade,
  added_at       timestamptz not null default now(),
  primary key (collection_id, recipe_id)
);
create index collection_recipes_recipe_idx on public.collection_recipes (recipe_id);

-- At most 50 collections per user (keeps the UI usable and limits abuse).
create function public.enforce_collection_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select count(*) from public.collections where user_id = new.user_id) >= 50 then
    raise exception 'You can have up to 50 collections.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger collections_limit
  before insert on public.collections
  for each row execute function public.enforce_collection_limit();

alter table public.collections enable row level security;
alter table public.collection_recipes enable row level security;

create policy "users manage own collections" on public.collections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the name can change (not the owner).
revoke update on public.collections from authenticated, anon;
grant update (name) on public.collections to authenticated;

create policy "users read own collection recipes" on public.collection_recipes
  for select to authenticated
  using (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())
  ));

-- Can only add recipes that are in your own library, to your own collections.
create policy "users add library recipes to own collections" on public.collection_recipes
  for insert to authenticated
  with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid()))
    and exists (select 1 from public.saved_recipes s where s.recipe_id = collection_recipes.recipe_id and s.user_id = (select auth.uid()))
  );

create policy "users remove from own collections" on public.collection_recipes
  for delete to authenticated
  using (exists (
    select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())
  ));

-- Rows are only added or removed, never edited.
revoke update on public.collection_recipes from authenticated, anon;
