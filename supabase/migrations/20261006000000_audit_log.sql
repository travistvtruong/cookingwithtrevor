-- Audit log (R22): an append-only record of admin actions.
--
-- Append-only is enforced in the database:
--   * no INSERT/UPDATE/DELETE policies, so the site's API can't write rows directly;
--   * a trigger rejects every UPDATE and DELETE, even from the table owner;
--   * TRUNCATE is revoked.
-- Rows are written by:
--   * log_admin_action(): admin-only function the app calls for recipe/review actions
--     (recipes is an existing table, so no trigger is added there);
--   * a trigger on blog_posts (new table), so blog changes are always logged;
--   * moderate_comment() (next migration), in the same transaction as the change.
-- actor_id has no foreign key on purpose: deleting a user must not need to
-- update (and so break) old audit rows.

create table public.audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor_id     uuid,
  actor_name   text,
  action       text not null check (char_length(action) between 1 and 60),
  entity_type  text not null check (char_length(entity_type) between 1 and 40),
  entity_id    text,
  summary      text not null default '' check (char_length(summary) <= 300),
  details      jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);

create function public.audit_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_or_delete
  before update or delete on public.audit_log
  for each row execute function public.audit_log_is_append_only();

alter table public.audit_log enable row level security;

create policy "admins read the audit log" on public.audit_log
  for select to authenticated using (public.is_admin());

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
revoke truncate on public.audit_log from public, anon, authenticated, service_role;

-- Internal writer (not callable from the API): records who did it from the JWT.
create function public.write_audit(
  p_action text, p_entity_type text, p_entity_id text, p_summary text, p_details jsonb
)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.audit_log (actor_id, actor_name, action, entity_type, entity_id, summary, details)
  values (
    auth.uid(),
    (select name from public.profiles where id = auth.uid()),
    p_action, p_entity_type, p_entity_id, left(coalesce(p_summary, ''), 300), coalesce(p_details, '{}')
  );
$$;
revoke execute on function public.write_audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- What the app calls. Only admins (with 2FA, via is_admin) can add entries.
create function public.log_admin_action(
  p_action text, p_entity_type text, p_entity_id text, p_summary text, p_details jsonb default '{}'
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can write to the audit log' using errcode = '42501';
  end if;
  perform public.write_audit(p_action, p_entity_type, p_entity_id, p_summary, p_details);
end;
$$;
revoke execute on function public.log_admin_action(text, text, text, text, jsonb) from public, anon;
grant execute on function public.log_admin_action(text, text, text, text, jsonb) to authenticated;

-- Blog posts: log every change in the database itself.
create function public.audit_blog_posts()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_action text;
begin
  if tg_op = 'DELETE' then
    perform public.write_audit('blog.deleted', 'blog_post', old.id::text, old.title, jsonb_build_object('slug', old.slug));
    return old;
  end if;

  v_action := case
    when tg_op = 'INSERT' and new.is_public then 'blog.published'
    when tg_op = 'INSERT' then 'blog.created'
    when new.is_public and not old.is_public then 'blog.published'
    when old.is_public and not new.is_public then 'blog.unpublished'
    else 'blog.updated'
  end;
  perform public.write_audit(v_action, 'blog_post', new.id::text, new.title, jsonb_build_object('slug', new.slug));
  return new;
end;
$$;

create trigger blog_posts_audit
  after insert or update or delete on public.blog_posts
  for each row execute function public.audit_blog_posts();
