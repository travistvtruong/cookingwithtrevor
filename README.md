# cookingwithtrevor

**A food blog for recipes and restaurant reviews, with a personal recipe library and grocery lists that combine ingredients across recipes.**

**Live site:** [cookingwithtrevor.vercel.app](https://cookingwithtrevor.vercel.app)

<p>
  <img src="docs/screenshots/home-desktop.png" alt="Home page: featured post card beside a tomato-red 'Cook it. Eat it. Rate it.' block" width="62%">
  <img src="docs/screenshots/review-mobile.png" alt="A food review on a phone: place, star rating and write-up" width="28%">
</p>

Built solo with Next.js 16, Supabase and Tailwind CSS. Scope, decisions and trade-offs are documented in [PRD.md](PRD.md) and [DECISIONS.md](DECISIONS.md) (40+ logged decisions, each with the alternative considered).

---

## What it does

**For readers**
- Recipe posts with a **Jump to recipe** button, ingredients, numbered steps, times and servings
- **Food reviews** of restaurants and dishes, with the place, location and a 1–5 star rating
- **Star ratings and comments** on every post, with an average shown on the post

**For signed-in home cooks**
- **Save** any recipe to a personal library with one click, add **private notes**, and **search** by name or tag
- Add your own **private recipes**, including photos that only you can see
- **Grocery lists:** pick several recipes and get one combined list. Matching items are merged (2 eggs + 3 eggs = 5 eggs, "2 cloves garlic, minced" + "1 clove garlic" = 3 cloves), different units stay separate. Tick items off on your phone in the store.

**For the author**
- A dashboard to write, edit, publish and unpublish recipes and reviews, without touching code
- **Phone photo uploads:** take a photo in the form; it's resized on the device and its GPS/EXIF data is stripped before upload
- Moderate comments directly on the post

<p>
  <img src="docs/screenshots/home-mobile.png" alt="Home page on a phone" width="30%">
  <img src="docs/screenshots/recipe-mobile.png" alt="A recipe post on a phone" width="30%">
</p>

## Tech stack

| | |
| --- | --- |
| Framework | **Next.js 16** (App Router, Server Components, Server Actions, Proxy), **TypeScript** |
| Database, auth, storage | **Supabase**: Postgres with row-level security, email/password auth, Storage |
| Styling | **Tailwind CSS 4**, theme tokens, Montserrat + Geist via `next/font` |
| Validation | **zod** |
| Testing | **Vitest** (102 tests) |
| Hosting | **Vercel** (auto-deploys from `main`) |
| Email | Supabase Auth over Gmail SMTP |

## Engineering highlights

- **Security in the database, not just the UI.** Row-level security on every table: users only see their own library, private recipes, notes and grocery lists. Only admins can publish; users can't change their own role (column-level grants). Admin status comes from a private email allow-list that the site's API can't read.
- **Private photos stay private.** Library photos live in a private storage bucket where each user can only touch their own folder. They're displayed through one-hour signed URLs and kept out of the shared image cache.
- **Atomic writes.** Saving a post (recipe + ingredients + steps) and creating a grocery list each run in one Postgres transaction via RPC, under the caller's permissions.
- **Fast, cached public pages.** Posts are pre-rendered and revalidated when saved (plus a 60-second fallback). Who's signed in is read in the browser, so public pages stay static.
- **Ingredient parser.** Turns "1½ Tablespoons olive oil" into `{ quantity: 1.5, unit: "tbsp", name: "olive oil" }`, normalising units so grocery lists can merge reliably. Ranges like "2-3 sprigs" are kept as written so they're never merged wrongly.
- **Spam protection.** One rating per person per post, a database-level rate limit on new accounts, and length limits.
- **SEO.** schema.org `Recipe` and `Review` data, a sitemap, robots.txt, canonical URLs and generated meta descriptions.

## Quality

**Lighthouse (mobile, live site):**

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Home | 97 | 100 | 100 | 100 |
| Recipe post | 98 | 100 | 100 | 100 |
| Review post | 98 | 100 | 100 | 100 |
| Reviews section | 98 | 100 | 100 | 100 |

**Accessibility:** WCAG AA colour contrast (checked for every colour pair), a skip link, labelled form fields and landmarks, keyboard-operable star pickers and checklists, and layouts tested down to 320px wide.

**Tests:** `npm test` runs 102 Vitest tests:
- **Unit tests:** ingredient parsing and formatting, grocery merge rules, slugs, the open-redirect guard on login, site-URL handling.
- **Flow tests:** the real Server Actions for sign-up, creating recipes and reviews, private photos, grocery lists, ratings/comments and photo cleanup, run against a recording fake Supabase client so they never touch a real database.

Database rules (RLS, triggers) aren't covered by automated tests yet; that needs a separate test Supabase project.

---

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable key (Supabase > Project Settings > API).
3. In the Supabase SQL Editor, run each file in `supabase/migrations/` in order (oldest first).
4. `npm run dev` and open http://localhost:3000

```
npm test               # run the tests once
npm run test:watch     # re-run on save
npm run lint
npm run build
npm run screenshots    # re-take the README screenshots from the live site
```

### Make yourself the admin

Add your email (lowercase) to the private admin list in the Supabase SQL Editor:

```sql
insert into public.admin_emails (email) values ('you@example.com');
```

That account becomes admin now (if it exists and is confirmed), and automatically whenever it signs in with a confirmed email, even if the account is recreated. The list can't be read through the site's API and is kept out of this repo.

### Auth redirect URLs

In Supabase > Authentication > URL Configuration, set the Site URL to your deployed URL and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to Redirect URLs. Sign-in is email and password only.

### Confirmation emails

Supabase's built-in email only reaches your own team's addresses, so set up custom SMTP in Supabase > Authentication > Emails > SMTP Settings. This project uses a dedicated Gmail account with an [app password](https://myaccount.google.com/apppasswords) (`smtp.gmail.com`, port 465); a custom domain with a service like Resend delivers better. Then, in Authentication > Emails > Confirm signup, use this link so it works in any browser or device:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Without custom SMTP, confirmation still works: if the link opens in a different browser, the user is told their email is confirmed and asked to sign in.

## Project structure

```
app/
  page.tsx               home: featured post, latest recipes and reviews
  recipes/, reviews/     section pages and post pages (cached, rebuilt on save)
  admin/                 author dashboard: create, edit, publish, delete posts
  library/               saved and private recipes, search, notes
  grocery/               grocery lists: combine recipes, tick items off
  login/, auth/          email sign-in/sign-up and confirmation handlers
  comment-actions.ts     ratings and comments
  sitemap.ts, robots.ts
components/              shared UI (post page, cards, forms, photo upload, nav)
lib/                     data access, validation, ingredient parser, grocery merge, photos
lib/supabase/            Supabase clients (browser, server, public, proxy)
proxy.ts                 refreshes auth sessions; guards /library, /grocery, /admin
supabase/migrations/     schema, row-level security, storage policies, RPCs
tests/                   unit tests and Server Action flow tests
scripts/screenshots.mjs  README screenshots via Chrome DevTools Protocol
```
