# Overnight notes: 2026-09-30 → 10-01

Branch: `overnight/2026-09-30` (not pushed). Previous night's notes are in git history (`git show 505779b:NOTES-overnight.md`).

## ⚠️ Read first: the PRD sections didn't exist

The instructions point to PRD sections (Update notes, Build status, "Patterns to follow", features 6-9, R14-R24, new tables, Phase 2, Phase 3). **`PRD.md` on disk is still the original 150-line version** (last changed in the first commit), and no other copy exists in the repo. So I inferred the requirements from the task list and existing patterns. Check these assumptions:

| Req (assumed) | What I'm building |
| --- | --- |
| R14-R17 Blog posts | A third post type for general articles: title, excerpt, body, cover photo, tags, draft/publish. **New `blog_posts` table** (the rules forbid changing `recipes`, whose `kind` check only allows recipe/review). `/blog` index + `/blog/<slug>` pages, dashboard create/edit/delete, nav, home, sitemap. R18 skipped as asked. |
| R19 Search | `/search?q=` across published recipes, reviews and blog posts, via a parameterized SQL function (no table changes). |
| R20 Collections | Users group library recipes into named collections. New `collections` + `collection_recipes` tables. |
| R21 Admin 2FA | Supabase TOTP MFA. Admin pages require AAL2 (enroll/verify screens), and `is_admin()` requires `aal2` in the JWT, so the database enforces it too. |
| R22 Audit log | New append-only `audit_log` table, written only through an admin-only SQL function; UPDATE/DELETE blocked by trigger. Admin view at `/admin/audit`. |
| R23 Moderation queue | `ratings_comments.status` (the one allowed change to an existing table). Comments with links or blocked words land in `pending`, hidden until the admin approves them at `/admin/moderation`. |
| R24 README security section | Document all of the above. |
| "Patterns to follow" | Unknown, so I followed the existing code patterns: RLS on everything, Server Actions returning `{ error }` state, zod validation, migrations as files only, Vitest flow tests with the fake Supabase client. |

## Starting state
- `npm test`: 102/102 pass. `npm run build`: passes. Branch created from `main` @ `a563b59`.

## Log
(updated after each step)

### ✅ 1. Blog posts (R14-R17)
- Migration `20261002000000_blog_posts.sql`: new `blog_posts` table, RLS (public reads published; admin-only insert/update/delete), column-level grants, triggers for `updated_at` and first `published_at`.
- Dashboard: **New blog post**, a Blog posts list, create/edit/delete (`/admin/blog/...`), with the shared photo uploader for the cover.
- Public: `/blog` index, `/blog/<slug>` (cover, summary, date, body with headings/lists, BlogPosting JSON-LD), **Blog** in the nav and footer, **From the blog** on the home page (shown once there are posts), sitemap.
- Builds and pages work before the migration runs (missing table = no posts).
- Tests: 13 new (body format + publish/draft/update/validation/duplicate/RLS/404/delete). 115 total.
- No comments on blog posts (see DECISIONS).


### ✅ 2. Search (R19)
- Migration `20261003000000_search.sql`: `search_posts(query, limit)` SQL function (needs the blog migration first).
- `/search?q=` page with result cards for all three post types; a search icon in the header; `/search` hidden from crawlers.
- Before the migration runs, searches return "nothing found" instead of erroring.
- Tests: 7 new search flow tests (routing per type, short/empty/array queries skip the DB, length cap, SQL-looking input passed as a parameter, missing-function fallback, real errors surfaced). 122 total.


### ✅ 3. Collections (R20)
- Migration `20261004000000_collections.sql`: `collections` + `collection_recipes`, RLS (own only; can only add recipes in your library), 50-per-user limit, name-only updates.
- Library page: **Collections** chips (All recipes + each, with counts) filter the library; create, rename and delete (recipes stay in the library).
- Recipe's library page: tick collections (instant, rolls back on failure) or create a new one and add in one step.
- Removing a recipe from the library also removes it from your collections.
- Before the migration runs: the library works, with no collections.
- Tests: 9 new collections flow tests. 131 total.
- ⚠️ Not checked in a browser (needs a signed-in user): please try it on your phone.


### ✅ 4. Admin 2FA (R21)
- `requireAdmin` now requires the session to have passed 2FA (JWT `aal2`); otherwise admins go to `/mfa`. Non-admins still get a 404.
- `/mfa`: first time, shows a QR code + text key to add to an authenticator app, then a 6-digit code; after that, just the code. Clears half-finished enrollments.
- Migration `20261005000000_admin_mfa.sql`: `is_admin()` requires `aal2`, so the database enforces 2FA for every admin rule.
- Tests: 5 new (aal2 passes, aal1 redirects with `next`, admin actions blocked too, non-admins still 404, signed out 404). 136 total.
- ⚠️ **Deploy order matters:** as soon as this code is live, the dashboard needs 2FA (the app check doesn't wait for the migration). Turn on TOTP MFA in Supabase **before** deploying, then enroll at `/mfa`.
- ⚠️ Not tested in a real browser (needs your admin login + MFA enabled).
- Lost your phone? Delete the factor in Supabase > Authentication > Users > your user.


### ✅ 5. Audit log (R22)
- Migration `20261006000000_audit_log.sql`: `audit_log` table, **append-only** (no write policies; a trigger rejects UPDATE/DELETE even for the owner; TRUNCATE revoked); readable by admins with 2FA only.
- Logged: recipe/review created/published/updated/unpublished/deleted (app → `log_admin_action`), every blog post change (DB trigger on `blog_posts`), the admin deleting someone else's comment, and moderation decisions (next step, inside the DB function).
- `/admin/audit` page (latest 200 entries); "Audit log" link in the dashboard nav.
- Logging is best-effort: a failed write is logged as a server warning and never blocks the action. The tests caught a crash path here; it's fixed.
- Tests: 9 new. 145 total.
- Gap: app-side logging can be skipped by someone calling the API directly as admin (with 2FA). Triggers on `recipes` would close it, but the overnight rules forbid changing that table.


### ✅ 6. Moderation queue (R23)
- Migration `20261007000000_moderation.sql`: `ratings_comments.status` (approved/pending/rejected; existing rows approved). A DB trigger holds comments with links, bare domains, email addresses or spam words as **pending**, and re-checks edits. Users can't write `status`. RLS: readers see approved only; authors see their own; the admin sees all. Ratings average counts approved only. `moderate_comment()` approves/rejects and writes the audit log in one transaction.
- `/admin/moderation`: pending comments, oldest first, with Approve/Reject; "Moderation" link in the dashboard nav.
- Commenters see "Thanks! Your comment will appear once it's been approved"; on the post they see their own pending comment with a note.
- Works before the migration (no status = approved).
- Tests: 11 new (flagged comment → pending, no status sent, clean → posted, edit re-check, rejected message, pre-migration, approve/reject, bad decision, deleted comment, admin + 2FA). 156 total.
- The SQL flag rules themselves aren't unit-tested (no test database). Try posting a comment with a link after running the migration.


### ✅ 7. README security section (R24)
- New **Security** section: accounts + admin (allow-list + 2FA + DB enforcement), a table of who can read/write what, comments/spam/moderation, the append-only audit log, uploads, platform, and known gaps. Feature list, setup steps (enable MFA first) and project structure updated.
- Added baseline **security headers** in `next.config.ts` (checked locally). Full CSP deferred (see DECISIONS).


### ✅ 8. Mobile layout (R8) and speed (R13) check
- **Layout at 320px**, every public page (home, recipes, reviews, blog, search + results, login, recipe post, review post, 404): no sideways scroll, nothing off-screen, one h1 each, all images have alt text, all fields labelled. Signed-in pages added tonight were reviewed in code (I can't sign in).
- **Fixed:** standalone text links (Sign in/out, See all, back links, View post, dashboard nav) were 20px tall, under the 24px WCAG 2.2 minimum; now 32px. Card images now request the right width on phones (saves 15-35 KB).
- **Lighthouse on a local production build** (slower than Vercel; the review page scores 94 here vs 98 live):

  | Page | Perf | A11y | Best | SEO | LCP |
  | --- | --- | --- | --- | --- | --- |
  | Home (warm cache) | 95 | 100 | 100 | 100 | 2.9 s |
  | /blog | 96 | 100 | 100 | 100 | 2.7 s |
  | /search?q=mango | 95 | 100 | 100 | 63 (noindex on purpose) | 3.0 s |
  | Review post | 94 | 100 | 100 | 100 | 3.0 s |

  The home page's first run scored 89 because the local image resizer was cold (3 s for the first photo); Vercel caches resized images. **Re-run Lighthouse on the live site after deploying** to confirm.
- Side discovery: the new `X-Frame-Options: DENY` header blocks framing even from the same site (my first audit script used iframes), which confirms it works.


### ✅ 9. Requested flow tests (task 4)
Written alongside each feature: publishing a blog post (`tests/flows/blog-post.test.ts`), search results (`search.test.ts`), adding to a collection (`collections.test.ts`), a flagged comment landing in pending (`moderation.test.ts`).

### ✅ 10. Multiple photos per post (task 5)
- Migration `20261008000000_post_photos.sql`: `post_photos` (recipe/review **or** blog post parent, caption, position, up to 12), RLS (visible with the post; admin writes), `set_post_photos()` replaces a gallery in one transaction and returns removed files.
- Dashboard: **More photos** section in the recipe/review and blog forms: pick several at once (or take photos on a phone), resized on the device, captions, ↑/↓ reorder, remove. Save is disabled while uploading.
- Public pages: a **Photos** grid (2 columns on phones, 3 on desktop) after the review write-up / after the recipe card / at the end of a blog post; each opens full size; captions shown; gallery photos added to the JSON-LD images.
- Files removed from a gallery or belonging to a deleted post are deleted from storage (never the main photo).
- Before the migration: posts still load and save; adding extra photos explains the migration is needed.
- Library (private) recipes keep a single photo.
- Tests: 12 new. 168 total.
- ⚠️ Not tried in a browser (dashboard needs your admin login + 2FA).
