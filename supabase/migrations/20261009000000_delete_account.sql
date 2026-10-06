-- Lets a signed-in reader delete their own account.
-- Deleting the auth.users row cascades to profiles and from there to everything
-- the user owns (library recipes, ratings and comments, grocery lists,
-- collections). audit_log keeps its rows: actor_id has no foreign key.
-- Photos in the private user-photos bucket are removed by the app first,
-- through the Storage API (Supabase doesn't allow deleting storage rows in SQL).
--
-- Admin accounts can't delete themselves here: they own the published posts,
-- which would cascade away with them.

create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid and role = 'admin')
     or exists (
       select 1 from public.admin_emails a
       join auth.users u on lower(u.email) = lower(a.email)
       where u.id = v_uid
     ) then
    raise exception 'admin accounts cannot be deleted from the site' using errcode = '42501';
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
