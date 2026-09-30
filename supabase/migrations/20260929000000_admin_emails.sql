-- Automatic admin role by email.
-- Emails listed in admin_emails become admin as soon as their address is
-- confirmed (email sign-up or Google), including if the account is recreated.
-- The list lives in the database, not in this public repo: add yours in the
-- Supabase SQL Editor with
--   insert into public.admin_emails (email) values ('you@example.com');

create table public.admin_emails (
  email text primary key check (email = lower(email))
);

-- RLS on with no policies: the site's API can never read or change this list.
-- Only the SQL Editor / service role can.
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

-- Promote a user to admin if their confirmed email is on the list.
create function public.sync_admin_role()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and exists (select 1 from public.admin_emails where email = lower(new.email)) then
    update public.profiles set role = 'admin' where id = new.id and role <> 'admin';
  end if;
  return new;
end;
$$;

-- Runs after handle_new_user (alphabetical trigger order: on_auth_user_created
-- comes before on_auth_user_sync_admin), so the profile row already exists.
create trigger on_auth_user_sync_admin
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.sync_admin_role();

-- Also promote when an email is added to the list for an existing account.
create function public.apply_admin_email()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles p set role = 'admin'
  from auth.users u
  where u.id = p.id
    and lower(u.email) = new.email
    and u.email_confirmed_at is not null
    and p.role <> 'admin';
  return new;
end;
$$;

create trigger on_admin_email_added
  after insert on public.admin_emails
  for each row execute function public.apply_admin_email();
