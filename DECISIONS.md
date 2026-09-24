# Decisions

Major technical decisions for cookingwithtrevor, newest last.

| Date | Decision | Reason | Alternative considered |
| --- | --- | --- | --- |
| 2026-09-24 | Next.js (App Router) + TypeScript | Server-rendered pages give the blog SEO and shareable links; TypeScript reads well in a portfolio. | Astro: faster static blog, weaker for signed-in app features. |
| 2026-09-24 | Supabase for Postgres, auth and image storage | One free service covers DB, email/Google login and photos; row-level security enforces per-user data without a custom backend. | Firebase: non-relational, poor fit for recipes/ingredients/ratings. |
| 2026-09-24 | Supabase Auth (via `@supabase/ssr`) instead of a separate auth library | Fastest path on a weekend timeline and plugs straight into RLS policies. | Auth.js: more flexible but must be bridged to Supabase RLS manually. |
| 2026-09-24 | Tailwind CSS | Quick mobile-first layouts (R8) and a small CSS bundle for the <2s load target (R13). | CSS Modules: no dependency, slower to build responsive UI. |
| 2026-09-24 | Vercel hosting | Free, built by the Next.js team, auto-deploys on push for a live demo URL. | Netlify: also free, Next.js support lags slightly. |
| 2026-09-24 | Folder structure: `app/` routes per MVP feature, `components/`, `lib/supabase/`, `supabase/migrations/` | Routes map 1:1 to MVP features; versioned SQL makes schema changes visible in the repo. | Feature folders (`features/recipes/...`): cleaner at scale, overkill for the MVP. |
| 2026-09-24 | `profiles` table linked to Supabase's `auth.users`, filled by a sign-up trigger, instead of a standalone `users` table | Supabase already stores login data; `profiles` holds only public fields (name, role), and column grants stop users changing their own role. | Standalone `users` table synced by app code: duplicates auth data and can drift. |
| 2026-09-24 | One rating/comment per user per recipe, plus a DB-trigger rate limit (3/hour for accounts under 24h, 10/hour after) | Stops rating stuffing and new-account spam at the database, so it holds even if the UI is bypassed. | Rate limiting in app code: easier to tweak, but a direct API call skips it. |
| 2026-09-24 | Header reads login state in the browser, not on the server | Keeps blog pages static and cacheable for the <2s mobile target (R13). | Server-side session in the layout: simpler, but makes every page dynamic. |
| 2026-09-24 | Grocery list items in a separate `grocery_list_items` table instead of a JSON `items` array | Checking off one item is a single-row update, and merging matching units is a simple query. | JSON array on `grocery_lists` (as in PRD): fewer tables, but every checkbox rewrites the whole list. |
