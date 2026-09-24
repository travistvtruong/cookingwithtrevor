-- cookingwithtrevor initial schema (MVP: R1-R6)
-- Run in Supabase: SQL Editor > paste > Run  (or `supabase db push` with the CLI)

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Profiles: public data for each auth user. Login data lives in auth.users.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 80),
  role        text not null default 'reader' check (role in ('reader', 'admin')),
  created_at  timestamptz not null default now()
);

-- Create a profile automatically on sign-up (email or Google).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    ), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Recipes. Public blog posts (is_public) and private library/imported recipes.
-- ---------------------------------------------------------------------------
create table public.recipes (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  intro         text not null default '',
  photo_url     text,
  prep_min      integer check (prep_min >= 0),
  cook_min      integer check (cook_min >= 0),
  servings      integer check (servings > 0),
  tags          text[] not null default '{}',
  is_public     boolean not null default false,
  source_url    text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index recipes_author_idx on public.recipes (author_id);
create index recipes_public_idx on public.recipes (published_at desc) where is_public;
create index recipes_tags_idx on public.recipes using gin (tags);
create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- "position" rather than "order", which is a reserved word in SQL.
create table public.ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  position   integer not null,
  quantity   numeric check (quantity > 0),
  unit       text,
  name       text not null check (char_length(name) between 1 and 200)
);
create index ingredients_recipe_idx on public.ingredients (recipe_id, position);

create table public.steps (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  position   integer not null,
  text       text not null check (char_length(text) between 1 and 2000)
);
create index steps_recipe_idx on public.steps (recipe_id, position);

-- ---------------------------------------------------------------------------
-- Personal library
-- ---------------------------------------------------------------------------
create table public.saved_recipes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  notes       text not null default '' check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

-- ---------------------------------------------------------------------------
-- Ratings and comments: one per user per recipe, so averages can't be stuffed.
-- ---------------------------------------------------------------------------
create table public.ratings_comments (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  stars       smallint not null check (stars between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 2000),
  created_at  timestamptz not null default now(),
  unique (recipe_id, user_id)
);
create index ratings_recipe_idx on public.ratings_comments (recipe_id, created_at desc);

-- Rate limit: accounts younger than 24h get 3 reviews per hour; others 10 per hour.
create function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  account_age interval;
  recent      integer;
begin
  select now() - created_at into account_age from public.profiles where id = new.user_id;
  select count(*) into recent
    from public.ratings_comments
    where user_id = new.user_id and created_at > now() - interval '1 hour';

  if recent >= (case when account_age < interval '24 hours' then 3 else 10 end) then
    raise exception 'Too many reviews. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger ratings_rate_limit
  before insert on public.ratings_comments
  for each row execute function public.enforce_review_rate_limit();

create view public.recipe_ratings
with (security_invoker = true) as
  select recipe_id,
         round(avg(stars)::numeric, 1) as average,
         count(*)::integer            as count
  from public.ratings_comments
  group by recipe_id;

-- ---------------------------------------------------------------------------
-- Grocery lists
-- ---------------------------------------------------------------------------
create table public.grocery_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null default 'Grocery list' check (char_length(name) <= 100),
  created_at  timestamptz not null default now()
);
create index grocery_lists_user_idx on public.grocery_lists (user_id, created_at desc);

create table public.grocery_list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.grocery_lists (id) on delete cascade,
  position   integer not null,
  name       text not null check (char_length(name) between 1 and 200),
  quantity   numeric check (quantity > 0),
  unit       text,
  checked    boolean not null default false
);
create index grocery_items_list_idx on public.grocery_list_items (list_id, position);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.recipes            enable row level security;
alter table public.ingredients        enable row level security;
alter table public.steps              enable row level security;
alter table public.saved_recipes      enable row level security;
alter table public.ratings_comments   enable row level security;
alter table public.grocery_lists      enable row level security;
alter table public.grocery_list_items enable row level security;

-- Profiles: names are public (shown on comments). Users may only change their name,
-- never their role.
create policy "profiles are readable" on public.profiles
  for select using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;

-- Recipes: public posts are visible to all; private ones only to their author.
-- Only admins can publish.
create policy "read public or own recipes" on public.recipes
  for select using (is_public or author_id = (select auth.uid()));
create policy "insert own recipes" on public.recipes
  for insert to authenticated
  with check (author_id = (select auth.uid()) and (not is_public or public.is_admin()));
create policy "update own recipes" on public.recipes
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and (not is_public or public.is_admin()));
create policy "delete own recipes" on public.recipes
  for delete to authenticated using (author_id = (select auth.uid()));

-- Ingredients and steps follow their recipe.
create policy "read ingredients of visible recipes" on public.ingredients
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "authors manage ingredients" on public.ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));

create policy "read steps of visible recipes" on public.steps
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id));
create policy "authors manage steps" on public.steps
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.author_id = (select auth.uid())));

-- Library: fully private. Can only save recipes you can see.
create policy "users manage own saved recipes" on public.saved_recipes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id)
  );

-- Ratings/comments: readable on public posts; users write their own; admin can delete any.
create policy "read reviews on public recipes" on public.ratings_comments
  for select using (exists (select 1 from public.recipes r where r.id = recipe_id and r.is_public));
create policy "users add own review on public recipes" on public.ratings_comments
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.recipes r where r.id = recipe_id and r.is_public)
  );
create policy "users edit own review" on public.ratings_comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- Only stars and comment are editable (not recipe_id, user_id or created_at).
revoke update on public.ratings_comments from authenticated, anon;
grant update (stars, comment) on public.ratings_comments to authenticated;
create policy "users or admin delete reviews" on public.ratings_comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Grocery lists: fully private.
create policy "users manage own lists" on public.grocery_lists
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "users manage own list items" on public.grocery_list_items
  for all to authenticated
  using (exists (select 1 from public.grocery_lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.grocery_lists l where l.id = list_id and l.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Storage: public recipe photos, uploaded by the admin only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

create policy "admin uploads recipe photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and public.is_admin());
create policy "admin updates recipe photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-photos' and public.is_admin());
create policy "admin deletes recipe photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and public.is_admin());
