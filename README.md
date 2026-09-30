# cookingwithtrevor

A food blog and personal recipe tracker: read and rate recipes, save them to your library, and turn them into a combined grocery list.

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Postgres, Auth, Storage) · Tailwind CSS · Vercel

- Product spec: [PRD.md](PRD.md)
- Technical decisions: [DECISIONS.md](DECISIONS.md)

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key (Supabase dashboard > Project Settings > API).
3. Apply the database schema: open Supabase > SQL Editor and run each file in `supabase/migrations/` in order (oldest first).
4. Start the dev server: `npm run dev` and open http://localhost:3000

### Confirmation emails

Works out of the box with Supabase's default email. If a user opens the link in a different browser than the one they signed up in, their email is still confirmed and they're asked to sign in.

**Before launch:** Supabase's built-in email only delivers to your own team's addresses. Set up custom SMTP in Supabase > Authentication > Emails > SMTP Settings. This project uses Gmail (`smtp.gmail.com`, port 465, a dedicated Gmail account and an [app password](https://myaccount.google.com/apppasswords)); a custom domain with a service like Resend delivers better. Then, in Authentication > Emails > Confirm signup, replace the link with:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

That signs users in from any browser or device via `/auth/confirm`.

### Make yourself the admin

After running the migrations, add your email (lowercase) to the private admin list in the Supabase SQL Editor:

```sql
insert into public.admin_emails (email) values ('you@example.com');
```

That account becomes admin now (if it exists and is confirmed) and automatically whenever it signs in with a confirmed email in future, even if the account is recreated. The list is not readable through the site's API, and it's kept out of this repo so the email isn't published.

### Google sign-in

1. In Google Cloud Console, create an OAuth client (Web application). Add `https://<your-project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI.
2. In Supabase > Authentication > Sign In / Providers > Google, paste the client ID and secret.
3. In Supabase > Authentication > URL Configuration, set the Site URL and add `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback` to Redirect URLs.

## Project structure

```
app/                 routes (one folder per feature)
  login/             sign in / sign up (email + Google)
  auth/callback/     OAuth and email-confirmation handler
  recipes/[slug]/    public recipe post (cached, rebuilt on save)
  admin/             author dashboard: list, create, edit, delete posts
  library/           personal library: saved and private recipes, search, notes
  grocery/           grocery lists: combine recipes, check items off
components/          shared UI
lib/supabase/        Supabase clients (browser, server, proxy)
proxy.ts             refreshes auth sessions; guards /library, /grocery, /admin
supabase/migrations/ database schema and row-level security policies
```

## Security

- Row-level security on every table: users only see their own library, private recipes and grocery lists.
- Only admins can publish posts or upload photos; users cannot change their own role.
- Comments are length-limited in the database and rendered as plain text.
- Reviews are limited to one per user per recipe, with a rate limit on new accounts.
