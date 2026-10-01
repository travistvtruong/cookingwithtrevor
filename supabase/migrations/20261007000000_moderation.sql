-- Moderation queue (R23).
-- The one change to an existing table: ratings_comments.status.
-- Existing comments become 'approved'. The DATABASE decides the status:
-- a trigger flags comments with links/addresses or spam words as 'pending',
-- and users can't write the column, so the app (or a direct API call) can't
-- skip moderation. Pending comments are visible only to their author and the
-- admin, and don't count toward ratings until approved.
-- Requires 20261006000000_audit_log.sql (decisions are logged).

alter table public.ratings_comments
  add column status text not null default 'approved'
  check (status in ('approved', 'pending', 'rejected'));

create index ratings_comments_pending_idx on public.ratings_comments (created_at) where status = 'pending';

-- Flag rules. Kept deliberately simple; easy to extend.
create function public.comment_needs_review(p_comment text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_comment, '') ~* (
      'https?://|www\.'                                                   -- links
      || '|\m[a-z0-9-]+\.(com|net|org|io|co|ru|cn|xyz|info|biz|link|click|shop|top|online|site)\M' -- bare domains
      || '|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'                          -- email addresses
    )
    or coalesce(p_comment, '') ~* '\m(viagra|cialis|casino|crypto|bitcoin|forex|betting|loans?|porn|xxx|escort|telegram|whatsapp)\M';
$$;

create function public.set_comment_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Ignore any status the client sent.
    new.status := case when public.comment_needs_review(new.comment) then 'pending' else 'approved' end;
  elsif new.comment is distinct from old.comment then
    -- The author edited the text: re-check it. A rejected comment stays rejected.
    new.status := case
      when old.status = 'rejected' then 'rejected'
      when public.comment_needs_review(new.comment) then 'pending'
      else 'approved'
    end;
  end if;
  -- Otherwise (e.g. moderate_comment changing only the status) keep new.status.
  return new;
end;
$$;

create trigger ratings_comments_status
  before insert or update on public.ratings_comments
  for each row execute function public.set_comment_status();

-- Users can't choose the status: insert only these columns (update was
-- already limited to stars and comment).
revoke insert on public.ratings_comments from authenticated, anon;
grant insert (recipe_id, user_id, stars, comment) on public.ratings_comments to authenticated;

-- Readers see approved comments; authors also see their own; the admin sees all.
drop policy "read reviews on public recipes" on public.ratings_comments;
create policy "read approved reviews, own, or as admin" on public.ratings_comments
  for select using (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.is_public)
    and (status = 'approved' or user_id = (select auth.uid()) or public.is_admin())
  );

-- Averages count approved comments only.
create or replace view public.recipe_ratings
with (security_invoker = true) as
  select recipe_id,
         round(avg(stars)::numeric, 1) as average,
         count(*)::integer            as count
  from public.ratings_comments
  where status = 'approved'
  group by recipe_id;

-- Approve or reject a comment (admins with 2FA). Logged in the same transaction.
create function public.moderate_comment(p_id uuid, p_status text)
returns table (recipe_kind text, recipe_slug text)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_comment public.ratings_comments;
begin
  if not public.is_admin() then
    raise exception 'Only admins can moderate comments' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Status must be approved or rejected' using errcode = '22023';
  end if;

  update public.ratings_comments set status = p_status where id = p_id returning * into v_comment;
  if v_comment.id is null then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;

  perform public.write_audit(
    case when p_status = 'approved' then 'comment.approved' else 'comment.rejected' end,
    'comment', p_id::text,
    left(v_comment.stars || '★ ' || v_comment.comment, 300),
    jsonb_build_object('author_id', v_comment.user_id, 'recipe_id', v_comment.recipe_id)
  );

  return query select r.kind, r.slug from public.recipes r where r.id = v_comment.recipe_id;
end;
$$;

revoke execute on function public.moderate_comment(uuid, text) from public, anon;
grant execute on function public.moderate_comment(uuid, text) to authenticated;
