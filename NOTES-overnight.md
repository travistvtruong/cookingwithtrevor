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

**Next:** R19 search.
