-- Admin two-factor authentication (R21).
-- Admin powers now require a session that passed MFA (JWT claim aal = 'aal2').
-- Every admin rule (publishing, editing/deleting posts, deleting any comment,
-- uploading blog photos, moderation, the audit log) goes through is_admin(),
-- so this one change enforces 2FA in the database, not just in the app.
--
-- Before running: turn on TOTP MFA in Supabase (Authentication > Multi-Factor).
-- After running: your admin session needs 2FA. Sign in and go to /admin; the
-- site walks you through scanning a QR code with an authenticator app.
-- Lost your device? Delete the factor in Supabase > Authentication > Users.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
    );
$$;
